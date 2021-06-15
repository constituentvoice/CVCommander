from __future__ import absolute_import
from werkzeug.utils import secure_filename
from traceback import format_exc
import mimetypes
import shutil

import os
from flask import (
    Blueprint,
    jsonify,
    render_template,
    request,
    current_app,
    url_for,
    abort
    )

tmpl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'html' )
static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'static' )
cvc = Blueprint('cvc',__name__,template_folder=tmpl_path, static_folder=static_path )


@cvc.route('/list', methods=['GET'])
def list_files():
    path = request.args.get('path', '')
    search_path = os.path.join('static', 'uploads')
    if path and path != '/':
        search_path = os.path.join(search_path, path)

    files = os.listdir(search_path)
    files_out = []
    for f in files:
        path_args = ['static', 'uploads']
        full_path = f
        if path and path != '/':
            path_args.append(path)
            full_path = os.path.join(path, f)

        path_args.append(f)
        f_full_path = os.path.join(*path_args)
        size = os.path.getsize(f_full_path)
        modified = os.path.getmtime(f_full_path)
        f_out = {
            'url': url_for('static', filename=f'uploads/{f}', _external=True),
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
    try:
        output_data = []
        for k in request.files.keys():
            f = request.files.get(k)

            if not f or f.filename == '':
                continue

            filename = secure_filename(f.filename)
            f.save(os.path.join('static', 'uploads', filename))
            output_data.append(url_for('static', filename='uploads/' + filename, _external=True))
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

    full_path = os.path.join('static', 'uploads', folder)

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

    new_full_path = os.path.join('static', 'uploads', new_path)
    old_full_path = os.path.join('static', 'uploads', file_data.get('full_path'))

    if os.path.exists(new_full_path):
        filename = f'Copy_of_{filename}'
        if dest:
            new_path = os.path.join(dest, filename)
        else:
            new_path = filename
        new_full_path = os.path.join('static', 'uploads', new_path)

    try:
        shutil.copyfile(old_full_path, new_full_path)
        new_url = url_for('static', filename=new_path)
        output = {'status': 'OK', 'file': new_url}
    except IOError:
        current_app.logger.debug('failed', exc_info=True)
        output = {'status': 'error'}

    return jsonify(output)
