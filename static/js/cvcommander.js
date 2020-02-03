;(function( $, window, document, undefined ) {
	var plugin_name = "cvCommander",
		defaults = {
			width: 600,
			height: 400,
			upload_url: '/cvc/upload',
			upload_field: 'uploads',
			list_files_url: '/cvc/list',
			path: '/',
			modal: true,
			modal_css: null,
			button_class: 'btn btn-default',
			button_text: '',
			use_fa: true,
			fa_classes: 'fa-camera',
			error: function(msg) { console.log(msg); },
			file_error_timeout: 10,
			icons: {
				'application/postscript': 'file-pdf-o',
				'application/pdf': 'file-pdf-o',
				'application/msword': 'file-word-o',
				'application/.*excel': 'file-excel-o',
				'application/.*powerpoint': 'file-powerpoint-o',
				'text/plain': 'file-text-o',
				'text/html': 'file-code-o',
				'^[^\/]+\/.*(zip|compressed).*': 'file-archive-o',
				'image/png': ['self', 'file-image-o'],
				'image/x-png': ['self', 'file-image-o'],
				'image/gif': ['self', 'file-image-o'],
				'image/jpeg': ['self', 'file-image-o'],
				'image/tiff': ['self', 'file-image-o'],
				'^image\/': 'file-image-o',
				'^video\/': 'file-video-o',
				'^audio\/': 'file-audio-o',
				'dir': 'folder'
			}
		};

	var cvCommander = function ( element, config ) {
		this.element = element;
		this._defaults = defaults;
		this._name = plugin_name;
		this.config = config;

	};

	cvCommander.prototype = {
		init: function() {
			this.options = $.extend( {}, defaults, this.config );
			
			if( this.options.file_error_timeout > -1 ) {
				this.options.file_error_timeout *= 1000;
			}

			this.$elem = $(this.element);
			this.frame = null;
			this.$elem.wrap('<div class="input-group">');

			var button = $('<button />');
			button.attr('type', "button");
			button.addClass(this.options.button_class);
			
			var _markup = '';
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
			button.wrap('<span class="input-group-btn">');
			this.$elem.after( button.parent() );
		},
		human_size: function(bytes, iter) {
			var labels = ['B', 'K', 'M', 'G'];
			if(!iter) {
				iter = 0;
			}
			if(iter >= labels.length) {
				iter = labels.length - 1;
			}
			if(bytes < 1024 || iter >= labels.length) {
				return bytes + ' ' + labels[iter];
			}
			else {
				bytes = Math.round(bytes / 1024);
				return self.human_size(bytes, iter++);
			}
		},
		create_icon: function(icon_data, view_type) {
			var icon_out = '';
			if(!view_type) {
				view_type = 'icons';
			}
			var self = this;
			$.each(self.options.icons, function(rule, icon_name) {
				var rrule = new RegExp(rule);
				console.log(rule);
				if(icon_data.type.match(rrule) || icon_data.type === rule) {
					var icon_lg = icon_name;
					var icon_sm = icon_name;
					if(Array.isArray(icon_name)) {
						icon_lg = icon_name[0];
						icon_sm = icon_name[1];
					}
					if(icon_lg === 'self' && view_type === 'icons') {
						icon_out = '<div class="col-md-1 text-center"><img src="' + icon_data.url + '" style="max-width:8em; max-height:8em;" align="center">';
						icon_out += '<br>' + icon_data.name + '</div>';
					}
					else {
						if(view_type === 'icons') {
							icon_out = '<div class="col-md-1 text-center"><i class="fa fa-3x fa-' + icon_lg + '"></i><br>';
							icon_out += icon_data.name + '</div>'
						}
						else {
							icon_out = '<tr><td><i class="fa fa-' + icon_sm +'"></i>&nbsp;' + icon_data.name + '</td>';
							icon_out += '<td data-sort="'+ icon_data.modified + '">' + moment(icon_data.modified).format('ddd, MMM do, YYYY') + '</td>';
							icon_out += '<td data-sort="'+ icon_data.size + '">' + self.humansize(icon_data.size) + '</td></tr>';
						}
					}
					return false;
				}
			});
			if(!icon_out) {
				if(view_type == 'icons') {
					icon_out = '<div class="col-md-1 text-center"><i class="fa fa-3x fa-file-o"></i><br>';
					icon_out += icon_data.name + '</div>'
				}
				else {
					icon_out = '<tr><td><i class="fa fa-' + icon_sm +'"></i>&nbsp;' + icon_data.name + '</td>';
					icon_out += '<td data-sort="'+ icon_data.modified + '">' + moment(icon_data.modified).format('ddd, MMM do, YYYY') + '</td>';
					icon_out += '<td data-sort="'+ icon_data.size + '">' + self.humansize(icon_data.size) + '</td></tr>';
				}
			}
			return icon_out;
		},
		list:function(folder, refresh, options) {
			var self = this;
			var listpane = this.frame.find('#cvclistcontent');
			if(refresh) {
				listpane.html('');
			}
			if(!options) {
				options = {};
			}
			var viewtype = options.view || 'icons';

			$.getJSON(self.options.list_files_url, function(resp) {
				$.each(resp.files, function(idx, obj) {
					var icon_markup = self.create_icon(obj, viewtype);
					listpane.append('<div style="clear:both; padding-top: 2px;">' + icon_markup + obj.name + '</div>');
				});
			});
		},
		progress:function(percent) {
			$('#cvcprogress').find('.progress-bar').attr('aria-valuenow', percent);
			$('#cvcprogress').find('.progress-bar').css('width',percent + '%');
		},
		upload:function( files ) {
			var self = this;

			if(files.length < 1) {
				return self.options.error('No files were selected for upload');
			}

			var fd = new FormData();
			var total_size = 0;
			$.each(files, function(idx, f) {
				fd.append( self.upload_field, f )
				total_size += f.size;
			});

			$('#cvcdropmessage').hide();
			$('#cvcprogress').show();
			console.log(fd);
			$.ajax( {
				xhr: function() {
					var xhrobj = $.ajaxSettings.xhr();
					if( xhrobj.upload ) {
						xhrobj.upload.addEventListener('progress', function(e) {
							var pos = e.loaded || e.position;
							var percent = 0;
							try {
								percent = Math.ceil(pos / total_size * 100);
							}
							catch(exc) {
							}
							self.progress(percent);
						}, false);
					}
					return xhrobj;
				},
				url: self.options.upload_url,
				type: 'POST',
				contentType: false,
				processData: false,
				data: fd,
				success: function(data) {
					$('#cvcdropmessage').show();
					$('#cvcprogress').hide();
					self.list('/', true);
					$('a[href="#cvclistview"]').click();
				},
				error: function(jqXHR, txtstatus, err) {
					self.options.error(txtstatus);
				}
			})
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
				frame.document.$('body').cvcommander = this;
				frame.close( function() {
					self.frame = null;
				});
				this.frame = frame.document.$('body');
				this.list('/', true);
			}
			else {
				frame = $('<div id="cvcframe" />');

				frame.load( '/cvcommander.html', function(resp,_status,xhr) {
					$(document.body).append(this);

					var _clean_event = function(e) {
						e.stopPropagation();
						e.preventDefault();
					}

					$(document).on('dragenter', function(e) {
						_clean_event(e);
					});
					$(document).on('dragover', function(e) {
						_clean_event(e);
					});
					$(document).on('click', '.cvview', function(e) {
						var folder = $(this).data('folder') || '/'
						self.list(folder, true, {view:$(this).data('view-type')})
					});
					$(document).on('dragenter','#cvclistview', function(e) {
						_clean_event(e);
						$('a[href="#cvcupload"]').click(); // ugly hack
						self.back_to_list = true;
					});

					/*$(document).on('dragleave','#cvcupload', function(e) {
						$('a[href="#cvclistview"]').click();
					});*/

					/*$(document).on('dragover','#cvclistview', function(e) {
						_clean_event(e);
						$('#cvcupload').tab('show');
					});*/

					$(document).on('dragenter','#cvcupload',function(e) {
						$('#cvcupload').removeClass('text-muted');
						_clean_event(e);
					});

					$(document).on('dragover','#cvcupload',function(e) {
						$('#cvcupload').removeClass('text-muted');
						_clean_event(e);
					});

					$(document).on('dragleave','#cvcupload',function(e) {
						$('#cvcupload').addClass('text-muted');
						if( self.back_to_list ) {
							$('a[href="#cvclistview"]').click();
						}
					});

					$(document).on('drop','#cvcupload',function(e) {
						console.log('DROP!');
						e.preventDefault();
						$('#cvcupload').addClass('text-muted');
						var files = e.originalEvent.dataTransfer.files;
						self.upload( files );
					});

					// for fallback reasons
					$(document).on('change', '#cvcuploadinput', function(e) {
						_clean_event(e);
						self.upload(this.files);
					});

					$('#cvc-container').modal('show');
					self.frame = frame;
					self.list('/', true)
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
