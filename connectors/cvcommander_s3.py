from werkzeug.utils import secure_filename
import boto3
import re
from botocore.errorfactory import ClientError
from time import mktime, time
from datetime import datetime

import os
from flask import (
    Blueprint,
    jsonify,
    request,
    current_app,
    abort,
    g
)

tmpl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'html')
cvcs3 = Blueprint('cvc', __name__, template_folder=tmpl_path)

s3 = boto3.client('s3')


# TODO figure out the best way to get these config items
def get_cvc_config():
    return {
        'bucket': g.cvc_bucket or current_app.config.get('CVC_S3_DEFAULT_BUCKET'),
        'bucket_prefix': g.cvc_bucket_prefix or current_app.config.get('CVC_S3_BUCKET_PREFIX'),
        'bucket_url': g.cvc_bucket_url or current_app.config.get('CVC_S3_BUCKET_URL')
    }


def s3_exists(key):
    cvc = get_cvc_config()
    try:
        s3.head_object(Bucket=cvc.get('bucket'), Key=key)
        return True
    except ClientError:
        return False


@cvcs3.route('/list', methods=['GET'])
def list_files():

    path = request.args.get('path', '')
    cvc = get_cvc_config()

    def get_s3_files(_path, keys=None, continuation=''):
        if keys is None:
            keys = []

        opts = dict(
            Bucket=cvc.get('bucket'),
            Delimiter='/'
        )

        if _path == '/':
            _path = ''

        full_path = os.path.join(cvc.get('bucket_prefix'), _path)

        opts['Prefix'] = full_path
        if not opts['Prefix'].endswith('/'):
            opts['Prefix'] += '/'

        if continuation:
            opts['ContinuationToken'] = continuation

        response = s3.list_objects_v2(**opts)

        # get the "directories"
        directories = [p.get('Prefix') for p in response.get('CommonPrefixes', []) if p.get('Prefix') and
                       p.get('Prefix') != opts['Prefix']]

        for d in directories:
            d = d[:-1]  # strip the trailing /
            key = os.path.basename(d)

            internal_folder = re.sub('^{}/?'.format(cvc.get('bucket_prefix')), '', d)

            new_key = {
                'url': os.path.join(cvc.get('bucket_url'), d),
                'name': key,
                'size': 0,
                'modified': int(time()),
                'type': 'dir',
                'full_path': internal_folder
            }
            if new_key not in keys:
                keys.append(new_key)

        for child in response.get('Contents', []):
            if child == full_path:
                continue

            f_name = os.path.basename(child.get('Key', ''))
            if not f_name:
                continue

            new_key = {
                'url': os.path.join(cvc.get('bucket_url'), child.get('Key', '')),
                'name': f_name,
                'size': child.get('Size'),
                'modified': mktime(child.get('LastModified', datetime.now()).timetuple()),
                'full_path': os.path.join(_path, f_name)
            }

            info = s3.head_object(
                Bucket=cvc.get('bucket'),
                Key=child.get('Key')
            )
            new_key['type'] = info.get('ContentType', 'application/octet-stream')
            keys.append(new_key)

        if response.get('IsTruncated') and response.get('NextContinuationToken'):
            return get_s3_files(_path, keys, response.get('NextContinuationToken'))
        else:
            return keys

    try:
        files_out = get_s3_files(path)
        return jsonify({'files': files_out})
    except ClientError:
        return abort(502, 'Unable to list files from the server.')


@cvcs3.route('/upload', methods=['POST'])
def upload_file():
    cvc = get_cvc_config()

    path = request.args.get('path')

    if path == '/':
        path = ''

    full_path = os.path.join(cvc.get('bucket_prefix'), path)

    try:
        output_data = []
        for k in request.files.keys():
            f = request.files.get(k)

            if not f or f.filename == '':
                continue

            filename = secure_filename(f.filename)
            try:
                if full_path:
                    test_path = full_path
                    if not full_path.endswith('/'):
                        test_path += '/'

                    s3.head_object(Bucket=cvc.get('bucket'), Key=test_path)
            except ClientError:
                current_app.logger.error('Unable to check path existence', exc_info=True)
                return jsonify({'status': 'error', 'message': 'Selected path doesnt exist on the server'}), 400

            new_key = os.path.join(full_path, filename)
            try:
                resp = s3.put_object(Bucket=cvc.get('bucket'), Key=new_key, Body=f, ContentType=f.mimetype)
                output_data.append(os.path.join(cvc.get('bucket_url'), new_key))
            except ClientError:
                current_app.logger.error(f'Cannot create {new_key} in s3', exc_info=True)
                return abort(502, 'Bad status when attempting s3 upload')

            return jsonify({'files': output_data})
    except:
        current_app.logger.error('Unable to upload', exc_info=True)
        return "There was a problem uploading the file", 400


@cvcs3.route('/create/folder', methods=['POST'])
def create_folder():
    cvc = get_cvc_config()
    data = request.get_json()
    folder = data.get('name')
    path = data.get('path')
    if path and path != '/':
        folder = os.path.join(cvc.get('bucket_prefix'), path, folder)
    else:
        folder = os.path.join(cvc.get('bucket_prefix'), folder)

    if not folder.endswith('/'):
        folder += '/'

    if s3_exists(folder):
        abort(400, "Folder already exists")

    try:
        s3.put_object(Bucket=cvc.get('bucket'), Key=folder)
    except ClientError:
        current_app.logger.error('Cannot create new folder in s3', exc_info=True)
        abort(502, 'Unable to create folder (unknown)')

    return jsonify({'status': 'OK'})


@cvcs3.route('/copy', methods=['POST'])
def copy_file():
    cvc = get_cvc_config()
    data = request.get_json()
    dest = data.get('dest')
    file_data = data.get('file_data')
    filename = file_data.get('name')

    if dest and dest != '/':
        new_path = os.path.join(dest, filename)
    else:
        new_path = filename
        dest = ''

    new_full_path = os.path.join(cvc.get('bucket_prefix'), new_path)
    old_full_path = os.path.join(cvc.get('bucket_prefix'), file_data.get('full_path'))

    count = 0

    while count < 8 and s3_exists(new_full_path):
        count += 1
        if count > 1:
            final_file = f'Copy_{count}_of_{filename}'
        else:
            final_file = f'Copy_of_{filename}'

        if dest:
            new_path = os.path.join(dest, final_file)
        else:
            new_path = final_file

        new_full_path = os.path.join(cvc.get('bucket_prefix'), new_path)

    if count >= 8:
        output = {'status': 'error', 'message': 'Too many copies!'}
    else:
        try:
            s3.copy_object(Bucket=cvc.get('bucket'), CopySource={'Bucket': cvc.get('bucket'),
                                                                 'Key': old_full_path}, Key=new_full_path)
            new_url = os.path.join(cvc.get('bucket_url'), new_full_path)
            output = {'status': 'OK', 'file': new_url}
        except ClientError:
            current_app.logger.error('failed to paste copy', exc_info=True)
            output = {'status': 'error', 'message': 'failed to create copy'}

    return jsonify(output)


@cvcs3.route('/rename', methods=['POST'])
def rename_file():
    cvc = get_cvc_config()
    data = request.get_json()
    file_data = data.get('file_data')
    new_name = secure_filename(data.get('new_name'))

    # get rid of paths. They arent valid
    new_name = os.path.basename(new_name)
    old_full_path = os.path.join(cvc.get('bucket_prefix'), file_data.get('full_path'))
    new_name_path = os.path.join(os.path.dirname(old_full_path), new_name)

    if s3_exists(new_name_path):
        output = {'status': 'error', 'message': f'{new_name} already exists!'}
    else:
        try:
            s3.copy_object(Bucket=cvc.get('bucket'), CopySource={'Bucket': cvc.get('bucket'), 'Key': old_full_path},
                           Key=new_name_path)
            s3.delete_object(Bucket=cvc.get('bucket'), Key=old_full_path)
            output = {'status': 'OK', 'link': os.path.join(cvc.get('bucket_url'), new_name_path), 'new_name': new_name}
        except ClientError:
            output = {'status': 'error', 'message': 'Unable to rename the file'}

    return jsonify(output)


@cvcs3.route('/remove', methods=['DELETE'])
def remove():
    cvc = get_cvc_config()
    data = request.get_json()
    file_data = data.get('file_data')
    path = os.path.join(cvc.get('bucket_prefix'), file_data.get('full_path'))

    if s3_exists(path):
        try:
            s3.delete_object(Bucket=cvc.get('bucket'), Key=path)
            output = {'status': 'OK'}
        except ClientError:
            output = {'status': 'error', 'message': 'Unable to delete the file.'}

    else:
        output = {'status': 'error', 'message': 'File does not exist'}

    return jsonify(output)
