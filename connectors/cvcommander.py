from __future__ import absolute_import
from werkzeug.utils import secure_filename
from traceback import format_exc
import mimetypes
import shutil

import os
from flask import (
    Blueprint,
    jsonify,
    request,
    current_app,
    url_for,
    abort,
    g
)


def get_cvc_config():
    upload_folder = g.cvc_upload_folder or current_app.config.get('CVC_UPLOAD_FOLDER')
    return {
        'upload_folder': upload_folder,
        'search_path': os.path.join(current_app.config.get('CVC_STATIC_PATH'), upload_folder),
        'max_copies': int(current_app.config.get('CVC_MAX_COPIES')) or 8
    }


cvc = Blueprint('cvc', __name__, static_folder=current_app.config.get('CVC_STATIC_PATH'))


@cvc.route('/list', methods=['GET'])
def list_files():
    cfg = get_cvc_config()
    path = request.args.get('path', '')
    search_path = cfg.get('search_path')
    if path and path != '/':
        search_path = os.path.join(search_path, path)

    files = os.listdir(search_path)
    files_out = []
    for f in files:
        path_args = [search_path]
        full_path = f
        if path and path != '/':
            path_args.append(path)
            full_path = os.path.join(path, f)

        path_args.append(f)
        f_full_path = os.path.join(*path_args)
        size = os.path.getsize(f_full_path)
        modified = os.path.getmtime(f_full_path)
        f_out = {
            'url': url_for('static', filename=os.path.join(cfg.get('upload_folder'), full_path), _external=True),
            'name': f,
            'size': size,
            'modified': int(modified),
            'full_path': full_path
        }

        if os.path.isdir(f_full_path):
            f_out['type'] = 'dir'
        else:
            mime, encoding = mimetypes.guess_type(f_full_path)
            f_out['type'] = mime

        files_out.append(f_out)

    return jsonify({'files': files_out})


@cvc.route('/upload', methods=['POST'])
def upload_file():
    cfg = get_cvc_config()
    path = request.args.get('path')
    try:
        output_data = []
        for k in request.files.keys():
            f = request.files.get(k)

            if not f or f.filename == '':
                continue

            filename = secure_filename(f.filename)
            path_args = [cfg.get('search_path')]
            if path and path != '/':
                path_args.append(path)

            if not os.path.exists(os.path.join(*path_args)):
                return jsonify({'status': 'error', 'message': 'Selected path doesnt exist on the server'}), 400

            path_args.append(filename)
            f.save(os.path.join(*path_args))
            output_data.append(url_for('static', filename=os.path.join(cfg.get('upload_folder'), filename),
                                       _external=True))
            return jsonify({'files': output_data})
    except:
        current_app.logger.debug(format_exc())
        return "There was a problem uploading the file", 400


@cvc.route('/create/folder', methods=['POST'])
def create_folder():
    data = request.get_json()
    folder = data.get('name')
    path = data.get('path')
    if path and path != '/':
        folder = os.path.join(path, folder)

    cfg = get_cvc_config()
    full_path = os.path.join(cfg.get('search_path'), folder)

    try:
        os.mkdir(full_path)
    except FileExistsError:
        abort(400, "Folder already exists")

    return jsonify({'status': 'OK'})


@cvc.route('/copy', methods=['POST'])
def copy_file():
    data = request.get_json()
    dest = data.get('dest')
    file_data = data.get('file_data')
    filename = file_data.get('name')

    if dest and dest != '/':
        new_path = os.path.join(dest, filename)
    else:
        new_path = filename
        dest = ''
    cfg = get_cvc_config()
    new_full_path = os.path.join(cfg.get('search_path'), new_path)
    old_full_path = os.path.join(cfg.get('search_path'), file_data.get('full_path'))

    count = 0
    while count < cfg.get('max_copies') and os.path.exists(new_full_path):
        count += 1
        if count > 1:
            final_file = f'Copy_{count}_of_{filename}'
        else:
            final_file = f'Copy_of_{filename}'

        if dest:
            new_path = os.path.join(dest, final_file)
        else:
            new_path = final_file

        new_full_path = os.path.join(cfg.get('search_path'), new_path)

    if count >= cfg.get('max_copies'):
        output = {'status': 'error', 'message': 'Too many copies!'}
    else:
        try:
            shutil.copyfile(old_full_path, new_full_path)
            new_url = url_for('static', filename=os.path.join('uploads', new_path), _external=True)
            output = {'status': 'OK', 'file': new_url}
        except IOError:
            current_app.logger.debug('failed', exc_info=True)
            output = {'status': 'error', 'message': 'failed to create copy'}

    return jsonify(output)


@cvc.route('/rename', methods=['POST'])
def rename_file():
    data = request.get_json()
    cfg = get_cvc_config()

    file_data = data.get('file_data')
    new_name = secure_filename(data.get('new_name'))

    # get rid of paths. They arent valid
    new_name = os.path.basename(new_name)

    old_full_path = os.path.join(cfg.get('search_path'), file_data.get('full_path'))
    new_name_path = os.path.join(os.path.dirname(old_full_path), new_name)
    web_path = os.path.basename(file_data.get('full_path'))
    if os.path.exists(new_name_path):
        output = {'status': 'error', 'message': f'{new_name} already exists!'}
    else:
        try:
            os.rename(old_full_path, new_name_path)
            output = {'status': 'OK', 'link': url_for('static', filename=os.path.join(cfg.get('upload_folder'),
                                                                                      web_path, new_name),
                                                      _external=True), 'new_name': new_name}
        except (IOError, OSError):
            output = {'status': 'error', 'message': 'Unable to rename the file'}
    return jsonify(output)


@cvc.route('/remove', methods=['DELETE'])
def remove():
    data = request.get_json()
    cfg = get_cvc_config()
    file_data = data.get('file_data')
    path = os.path.join(cfg.get('search_path'), file_data.get('full_path'))
    if os.path.exists(path):
        try:
            os.unlink(path)
            output = {'status': 'OK'}
        except (IOError, OSError):
            output = {'status': 'error', 'message': 'Unable to delete the file.'}

    else:
        output = {'status': 'error', 'message': 'File does not exist'}

    return jsonify(output)
