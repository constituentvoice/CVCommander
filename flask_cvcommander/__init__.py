from .connectors import local, s3
import os
from flask import url_for, send_file, make_response


__version__ = '0.1'


class FlaskCVCommander(object):

    def __init__(self, app=None):

        if app is not None:
            self.init_app(app)

    def init_app(self, app):
        app.config.setdefault('CVC_CONNECTOR', 'local')
        app.config.setdefault('CVC_STATIC_PATH', app.static_folder or 'static')
        app.config.setdefault('CVC_MAX_COPIES', 8)
        app.config.setdefault('CVC_S3_SESSION', '')
        app.config.setdefault('CVC_S3_CLIENT_KWARGS', {})
        app.config.setdefault('CVC_MODULE_STATIC_URL', ':module:')
        app.config.setdefault('CVC_URL_PREFIX', '/cvc')

        _prefix = app.config['CVC_URL_PREFIX']

        app.config.setdefault('CVC_SCRIPT_FILENAME', 'cvcommander.js')  # TODO minify
        app.config.setdefault('CVC_STYLE_FILENAME', 'cvcommander.css')
        app.config.setdefault('CVC_INCLUDE_BOOTSTRAP', 4)
        app.config.setdefault('CVC_INCLUDE_FONTAWESOME', 5)
        app.config.setdefault('CVC_INCLUDE_JQUERY', 3)
        app.config.setdefault('CVC_LOAD_SCRIPT_CONFIG', True)
        app.config.setdefault('CVC_REPLACEMENT_SELECTOR', '.filebrowser')
        app.config.setdefault('CVC_OP_URLS', {
            'upload_url': os.path.join(_prefix, 'upload'),
            'list_files_url': os.path.join(_prefix, 'list'),
            'create_folder_url': os.path.join(_prefix, 'create', 'folder'),
            'copy_file_url': os.path.join(_prefix, 'copy'),
            'rename_file_url': os.path.join(_prefix, 'rename'),
            'remove_file_url': os.path.join(_prefix, 'remove')
        })
        app.config.setdefault('CVC_SCRIPT_CONFIG', {})

        js_defaults = app.config['CVC_OP_URLS'].update(app.config['CVC_SCRIPT_CONFIG'])

        def cvc_static(file):
            if app.config['CVC_MODULE_STATIC_URL'] == ':module:':
                url = os.path.join(app.config['CVC_URL_PREFIX'], 'static', file)
            elif app.config['CVC_MODULE_STATIC_URL'] == ':static:':
                url = url_for('static', filename=file)
            else:
                url = os.path.join(app.config['CVC_MODULE_STATIC_URL'], file)
            return url

        def cvc_script_config_route():
            resp = make_response(
                ';function($)'
            )

        def cvc_script():
            output = ''
            if isinstance(app.config['INCLUDE_JQUERY'], int):
                jquery_versions = {
                    '1': '1.12.4',
                    '2': '2.2.4',
                    '3': '3.6.0'
                }
                try:
                    jquery_url = f"https://code.jquery.com/jquery-{jquery_versions[app.config['INCLUDE_JQUERY']]}.min.js"
                except KeyError:
                    jquery_url = None
                    raise NotImplemented(f"No such jquery version {app.config['INCLUDE_JQUERY']}. Specify a major "
                                         f"version.")

                output += f'<script src="{jquery_url}"></script>'

            if isinstance(app.config['INCLUDE_BOOTSTRAP'], int):
                bootstrap_versions = {
                    '3': 'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
                    '4': 'https://stackpath.bootstrapcdn.com/bootstrap/4.1.3/js/bootstrap.min.js'
                }
                try:
                    bs_url = bootstrap_versions[app.config['INCLUDE_BOOTSTRAP']]
                except KeyError:
                    raise NotImplemented(f"No such Bootstrap version {app.config['INCLUDE_BOOTSTRAP']}. Specify a "
                                         f"major version")
                if app.config['INCLUDE_BOOTSTRAP'] < 3:
                    output += '<script ' \
                              'src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js">' \
                              '</script>'
                output += f'<script src="{bs_url}"></script>'

            script_url = cvc_static(app.config['CVC_SCRIPT_FILENAME'])

            return f'<script src="{script_url}"></script>'

        def cvc_styles():
            style_url = cvc_static(app.config['CVC_STYLE_FILENAME'])
            return f'<link rel="stylesheet" type="text/css" href="{style_url}">'

        def module_route(file):
            _dir = os.path.dirname(__file__)
            send_file(os.path.join(_dir, file))

        app.add_url_rule(f"{app.config['CVC_URL_PREFIX']}/<file>", view_func=module_route)

        app.jinja_env.globals['cvc_script'] = cvc_script
        app.jinja_env.globals['cvc_styles'] = cvc_styles

        if app.config['CVC_CONNECTOR'] == 'local':
            app.register_blueprint(local.cvc, url_prefix=app.config['CVC_URL_PREFIX'])
        elif app.config['CVC_CONNECTOR'] == 's3':
            app.register_blueprint(s3.cvcs3, url_prefix=app.config['CVC_URL_PREFIX'])
        else:
            raise NotImplemented(f"Connector of type {app.config['CVC_CONNECTOR']} is not implemented")
