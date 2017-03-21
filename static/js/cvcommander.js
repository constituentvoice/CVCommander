;(function( $, window, document, undefined ) {
	var plugin_name = "cvCommander",
		defaults = {
			width: 600,
			height: 400,
			upload_url: '/cvc/upload',
			list_files_url: '/cvc/list',
			path: '/',
			modal: true,
			modal_css: null,
			button_class: 'btn',
			button_text: '',
			use_fa: true,
			fa_classes: 'fa-camera',
			file_error_timeout: 10
		};

	var cvCommander = function ( element, config ) {
		this.element = element,
		this._defaults = defaults;
		this._name = plugin_name;
		this.config = config;

	}

	cvCommander.prototype = {
		init: function() {
			this.options = $.extend( {}, defaults, this.config );
			
			if( this.options.file_error_timeout > -1 ) {
				this.options.file_error_timeout *= 1000;
			}

			this.$elem = $(this.element);
			this.frame = null;
			
			var button = $('<button />')
			button.attr('type', "button");
			button.attr('class', this.options.button_class)
			
			_markup = '';
			if( this.options.use_fa ) {
				_markup += '<i class="fa ' + this.options.fa_classes + '"></i>';
				if( this.options.button_text ) {
					_markup += " ";
				}
			}

			var self = this;

			_markup += this.options.button_text;
			if( _markup ) {
				button.html(_markup)
			}

			button.click( function(e) {
				e.preventDefault();
				self.open_browser();
			});

			this.$elem.after( button );
		},
		list:function(folder) {
			var listpane = this.frame.find('#cvclistview');
			$.each([
				{'type':'application/pdf', 'name':'test.pdf'},
				{'type':'image/png', 'name':'foo.png'},
				{'type':'image/jpeg','name':'photo.jpg'},
				], function(idx,obj) {
					listpane.append('<div><i class="fa fa-file"></i> ' + obj.name + '</div>');
				});

		},
		upload:function(obj, folder) {
		},
		copy: function(obj, file, dest) {
		},
		move: function(obj, file, dest) {
		},
		remove: function(obj, file) {
		},
		view: function(obj, file) {
		},
		open_browser: function(obj) {
			var frame = null;
			var self = this;

			if( !this.options.modal ) {
				frame = window.open('/frame.html','cvcommander','width='+this.options.width+',height='+this.options.height+',menubar=no,location=no,resizable=yes,scrollbars=yes,status=no');
				frame.document.$('body').cvcommander = this
				frame.close( function() {
					self.frame = null;
				});
				this.frame = frame.document.$('body');
				this.list();
			}
			else {
				frame = $('<div />');
				try {
					var _top_percent = (this.options.height / window.innerHeight) * 25;
				}
				catch(exception) {
					var _top_percent = 30; // probably a divide by zero. Set to 30%
				}

				frame.css({
					'display':'block',
					'position':'fixed',
					'top': _top_percent.toString() + '%',
					'width': '100%' ,
					'height': this.options.height,
				});
				
				frame.load( '/cvcommander.html', function(resp,_status,xhr) {
					$(document.body).append(this)
					$('#cvc-container').css({
						'padding-top': '8px',
						'width': self.options.width + 'px',
						'height': self.options.height + 'px',
						'margin': '0 auto',
						'overflow': 'auto',
						'border': '1px solid #ccc',
						'border-radius': '8px',
						'box-shadow': '8px 8px 8px #ccc',
						'background-color': 'white'
					});
					$('.cvcclose').click(function(e) {
						e.preventDefault();
						self.frame = null;
						frame.remove();
					});
					
					$('a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
						var target = $(e.target).attr("href");
						if( target == '#cvcupload' ) {
							console.log('woot!');
							try {
								console.log(self.options.upload_url);
								$('#cvcuploaddz').dropzone({
									url:self.options.upload_url,
									uploadMultiple: true,
									init: function() {
										var dz = this;
										this.on("successmultiple", function() {
											//dz.removeAllFiles();
											self.list();
											$('#browsetab').click();
										}),
										this.on('cancelmultiple', function() {
											dz.removeAllFiles();
										}),
										this.on('completemultiple', function() {
											if(!dz.is_error) {
												dz.removeAllFiles();
											}
										}),
										this.on('error', function(f, error, xhr) {
											// TODO, error on types
											dz.is_error = true;
											console.log(f);
											$(f.previewElement).find('.dz-error-message').text('Upload failed.');
											if( self.options.file_error_timeout > -1 ) {
												setTimeout( dz.removeFile, self.config.file_error_timeout, f )
											}
										})

									}
								});
							}
							catch(e) {
								// do nothing. Already attached. Shouldn't happen
								console.log('attached?');
							}
						}
					});
					self.frame = frame;
					self.list()
				});
				
			}
		},
	};

	$.fn.cvcommander = function(options) {
		return this.each( function() {
			new cvCommander(this, options).init();
		});
	}

}( jQuery, window, document ));
