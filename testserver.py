from flask import Flask, render_template, g
from connectors.cvcommander import cvc
# from connectors.cvcommander_s3 import cvcs3  # use for s3 connector

app = Flask(__name__, static_folder='static', template_folder='html')

# S3 defaults
app.config['CVC_S3_DEFAULT_BUCKET'] = ''
app.config['CVC_S3_BUCKET_PREFIX'] = ''
app.config['CVC_S3_BUCKET_URL'] = ''

# Setup a request specific config for the s3 file manager
# @cvcs3.before_request
# def set_s3_config():
#    # Set these variables if needed per request
#    # or set the defaults above using s3
#    g.cvc_bucket = ''  # AWS bucket name
#    g.cvc_bucket_prefix = ''  # Optional prefix if your files are in a bucket folder that shouldn't be seen by a user
#    g.cvc_bucket_url = ''  # s3 or cloudfront URL to the bucket


# app.register_blueprint(cvcs3, url_prefix='/cvc')
app.register_blueprint(cvc, url_prefix='/cvc')


@app.route('/favicon.ico')
def fav():
    return '', 404


@app.route('/<_file>')
@app.route('/')
def slash(_file=None):
    if not _file:
        _file = 'test.html'

    if _file == 'favicon.ico':
        return 'NOT FOUND',404

    return render_template(_file)


if __name__ == '__main__':
    app.run(debug=True, host="0.0.0.0")
