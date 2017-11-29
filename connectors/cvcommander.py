from __future__ import absolute_import
from werkzeug.utils import secure_filename
from traceback import format_exc


import os
from flask import (
    Blueprint,
    jsonify,
    render_template,
    request
    )

tmpl_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'html' )
static_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), os.pardir, 'static' )
cvc = Blueprint('cvc',__name__,template_folder=tmpl_path, static_folder=static_path )

@cvc.route( '/list', methods=['GET'])
def list_files():
    path = request.args.get('path')

@cvc.route( '/upload', methods=['POST'])
def upload_file():
    try:
        for k in request.files.keys():
            f = request.files.get(k)

            if not f or f.filename == '':
                continue

            filename = secure_filename(f.filename)
            f.save( os.path.join('static','uploads',filename) )
    except:
        print format_exc()
        return "There was a problem uploading the file", 400


    return "OK"

