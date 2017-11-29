from __future__ import absolute_import

from flask import Flask, request, g, redirect,render_template
from connectors.cvcommander import cvc

app = Flask(__name__,static_folder='static', template_folder='html')

app.register_blueprint(cvc, url_prefix='/cvc')

@app.route('/<_file>')
@app.route('/')
def slash(_file=None):
    if not _file:
        _file = 'test.html'

    if _file == 'favicon.ico':
        return 'NOT FOUND',404

    return render_template(_file)

if __name__ == '__main__':
    app.run(debug=True,host="0.0.0.0")
