from __future__ import absolute_import
from werkzeug.utils import secure_filename
from traceback import format_exc
import mimetypes


import os
from flask import (
    Blueprint,
    jsonify,
    render_template,
    request,
    current_app,
    url_for
    )

tmpl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'html' )
static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'static' )
cvc = Blueprint('cvc',__name__,template_folder=tmpl_path, static_folder=static_path )


@cvc.route('/list', methods=['GET'])
def list_files():
    path = request.args.get('path', '.')
    files = os.listdir(os.path.join('static', 'uploads', path))
    files_out = []
    for f in files:
        f_full_path = os.path.join('static', 'uploads', f)
        mime, encoding = mimetypes.guess_type(f_full_path)
        size = os.path.getsize(f_full_path)
        modified = os.path.getmtime(f_full_path)
        files_out.append({
            'type': mime,
            'url': url_for('static', filename='uploads/{}'.format(f), _external=True),
            'name': f,
            'size': size,
            'modified': int(modified)
        })

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

