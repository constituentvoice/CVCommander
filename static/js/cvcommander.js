;(function( $, window, document, undefined ) {
	var plugin_name = "cvCommander",
		defaults = {
			width: 600,
			height: 400,
			upload_url: '/cvc/upload',
			upload_field: 'uploads',
			allow_inline_drop: true,
			list_files_url: '/cvc/list',
			path: '/',
			modal: true,
			modal_css: null,
			button_class: 'btn btn-light',
			button_text: '',
			fa_version: 5,
			fa_variant: 'regular',
			fa_icons: {
				openCommander: 'fa-camera',
				iconView: 'fa-th-large',
				listView: 'fa-th-list',
				closeCommander: 'fa-close',


			},
			error: function(msg) { console.log(msg); },
			file_error_timeout: 10,
			icons: {
				'application/postscript': 'file-pdf',
				'application/pdf': 'file-pdf',
				'application/msword': 'file-word',
				'application/.*excel': 'file-excel',
				'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'file-excel',
				'application/.*powerpoint': 'file-powerpoint',
				'text/plain': 'file-alt',
				'text/html': 'file-code',
				'application/x-sql': 'file-code',
				'^[^\/]+\/.*(zip|compressed).*': 'file-archive',
				'image/png': ['self', 'file-image'],
				'image/x-png': ['self', 'file-image'],
				'image/gif': ['self', 'file-image'],
				'image/jpeg': ['self', 'file-image'],
				'image/tiff': ['self', 'file-image'],
				'^image\/': 'file-image',
				'^video\/': 'file-video',
				'^audio\/': 'file-audio',
				'dir': 'folder'
			}
		};

	var _clean_event = function(e) {
		e.stopPropagation();
		e.preventDefault();
	};

	var cvCommander = function ( element, config ) {
		this.element = element;
		this._defaults = defaults;
		this._name = plugin_name;
		this.config = config;
		this._fa_base_class = "fa";
		this._fa_variants = {free: 'fas', regular: 'far', light: 'fal', duotone: 'fad'};

	};

	cvCommander.prototype = {
		init: function() {
			this.options = $.extend( {}, defaults, this.config );
			
			if( this.options.file_error_timeout > -1 ) {
				this.options.file_error_timeout *= 1000;
			}

			this.$elem = $(this.element);
			this.$elem.wrap('<div class="cvcinput input-group">');
			this.$elem.parent().wrap('<div class="cvccontainer">');
			this.$drop_container = this.$elem.parent().parent();
			if(this.fa_version > 4) {
				this._fa_base_class = this._fa_variants[this.fa_variant];
			}

			/* create modal */
			var $frame, $modal, $header, $body;
			if(this.options.modal) {
				$frame = $('<div>').attr('id', 'cvc-container').addClass('modal fade');
				$modal = $('<div>').addClass('modal-content');
				$header = $('<div>').addClass('modal-header')
				$body = $('<div>').addClass('modal-body')
			}
			else {
				$frame = $('<div>').attr('id', 'cvc-container');
				$modal = $('<div>').addClass('panel panel-default');
				$header = $('<div>').addClass('panel-header');
				$body = $('<div>').addClass('panel-body')
			}


			$header.append(
				$('<ul>').addClass('nav nav-tabs').attr('role', 'tablist').prop('id', 'cvcmaintabs').append(
					$('<li>').addClass('nav-item').append(
						$('<a>').attr({id: 'browsetab', href: '#cvclistview', role: 'tab', 'data-toggle': 'tab'})
							.addClass('nav-link active')
							.append($('<i>').addClass(this._fa_base_class + ' fa-folder-open-o'), ' Browse')
					),
					$('<li>').attr('role', 'presentation').append(
						$('<a>').addClass('nav-link').attr({href: '#cvcupload', role: 'tab', 'data-toggle': 'tab'})
							.append($('<i>').addClass(this._fa_base_class + ' fa-cloud-upload'), ' Upload')
					)
				),
				$('<button>').addClass('close').attr({type:'button', 'aria-label': 'Close', 'data-dismiss': 'modal'})
					.append($('<i>').addClass(this._fa_base_class + ' fa-sm fa-close'))
			);

			$body.append(
				$('<div>').addClass('tab-content').append(
					$('<div>').addClass('tab-pane active').attr('id', 'cvclistview').append(
						$('<div>').attr('id', 'cvclist-toolbar').append(
							$('<div>').addClass('btn-group').append(
								$('<a>').attr('href', '#').attr({name: 'Icon View', 'alt': 'Icon View'})
									.data('view-type', 'icons').addClass('cvview btn btn-sm btn-light').append(
										$('<i>').addClass(this._fa_base_class + ' fa-th-large')
								),
								$('<a>').attr('href', '#').attr({name: 'List View', alt: 'List View'})
									.data('view-type', 'list').addClass('cvview btn btn-sm btn-light').append(
										$('<i>').addClass(this._fa_base_class + ' fa-th-list')
								)
							)
						),
						$('<div>').attr('id', 'cvclistcontent').addClass('container')
					),
					$('<label>').addClass('tab-pane text-muted center').prop('id', 'cvcupload').append(
						$('<span>').addClass('cvcdropmessage').append('Drop files to upload'),
						$('<input>').attr({id: 'cvcuploadinput', type: 'file'}).css('display', 'none'),
						$('<div>').addClass('progress cvcprogress').css('display', 'none').append(
							$('<div>').addClass('progress-bar progress-bar-success').attr(
								{role:'progressbar', 'aria-valuenow': 60, 'aria-valuemin': 0, 'aria-valuemax': 100}
							).css('width', '0%')
						)
					)
				)
			);

			var $dialog = $('<div>').attr('role', 'document').addClass('modal-dialog modal-lg').append($modal);
			$modal.append($header, $body);
			if(this.options.modal) {
				$frame.append($dialog.append($modal));
			}
			else {
				$frame.append($modal);
			}

			this.frame = null;
			this.frame_html = $frame;

			/* create button */
			var button = $('<button />');
			button.attr('type', "button");
			button.addClass(this.options.button_class);
			
			var _markup = '';
			if( this.options.fa_icons.openCommander ) {
				_markup += '<i class="' + this._fa_base_class + ' ' + this.options.fa_icons.openCommander + '"></i>';
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

			if(this.options.allow_inline_drop) {
				this.$drop_container.append(
					$('<div>').addClass('cvcupload-inline center text-muted').css('display', 'none').append(
						$('<span>').addClass('cvcdropmessage').append('Drop files to upload and select'),
						$('<div>').addClass('progress cvcprogress').css('display', 'none').append(
							$('<div>').addClass('progress-bar progress-bar-success').attr(
								{role: 'progressbar', 'aria-valuenow': 60, 'aria-valuemin': 0, 'aria-valuemax': 100}
							).css('width', '0%')
						)
					)
				);
				var swap_inline = function(e, container, show_hide) {
					_clean_event(e);
					var cvcinput = $(container).find('.cvcinput');
					var cvcinline = $(container).find('.cvcupload-inline');

					if(show_hide === 'show') {
						cvcinline.show();
						cvcinput.hide();
					}
					else {
						cvcinput.show();
						cvcinline.hide();
					}
				};

				// create the drop event for the element itself
				$(document).on('dragenter', function(e) {
					_clean_event(e);
				});
				$(document).on('dragover', function(e) {
					_clean_event(e);
				});

				$(document).on('dragenter', '.cvccontainer', function(e) {
					swap_inline(e, this, 'show');
				});

				$(document).on('dragleave', '.cvccontainer', function(e) {
					var container = $(e.target).closest('.cvccontainer');
					if(e.target == this) {
						swap_inline(e, container, 'hide');
					}
				});

				$(document).on('dragend', function(e) {
					// try to ensure this always closes if we're not dragging
					swap_inline(e, '.cvcontainer', 'hide');
				});

				$(document).on('drop', '.cvcupload-inline', function(e) {
					e.preventDefault();
					var files = e.originalEvent.dataTransfer.files;
					var ipt = $(this).parent().find('.cvcinput');
					ipt.show();
					self.$elem.cvcommander('upload', files, function(data) {
						$('.cvcdropmessage').show();
						$('.cvcprogress').hide();

						self.$elem.val(data.files[0]);
					});
					$(this).parent().find('.cvcupload-inline').hide();
				});

			}
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
				return this.human_size(bytes, iter++);
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
				if(icon_data.type.match(rrule) || icon_data.type === rule) {
					var icon_lg = icon_name;
					var icon_sm = icon_name;
					if(Array.isArray(icon_name)) {
						icon_lg = icon_name[0];
						icon_sm = icon_name[1];
					}
					if(icon_lg === 'self' && view_type === 'icons') {
						icon_out = '<div class="cvc-file col-md-3 text-center" data-link="' + icon_data.url +'"><img src="' + icon_data.url + '" style="max-width:4em; max-height:4em;" align="center">';
						icon_out += '<br>' + icon_data.name + '</div>';
					}
					else {
						if(view_type === 'icons') {
							icon_out = '<div class="cvc-file col-md-3 text-center" data-link="' + icon_data.url + '"><i class="fas fa-3x fa-' + icon_lg + '"></i><br>';
							icon_out += icon_data.name + '</div>'
						}
						else {
							icon_out = '<tr class="cvc-file" data-link="' + icon_data.url + '"><td><i class="fa fa-' + icon_sm +'"></i>&nbsp;' + icon_data.name + '</td>';
							icon_out += '<td data-sort="'+ icon_data.modified + '">' + moment.unix(icon_data.modified).format('ddd, MMM do, YYYY') + '</td>';
							icon_out += '<td data-sort="'+ icon_data.size + '">' + self.human_size(icon_data.size) + '</td></tr>';
						}
					}
					return false;
				}
			});
			if(!icon_out) {
				if(view_type == 'icons') {
					icon_out = '<div class="col-md-3 text-center"><i class="fa fa-3x fa-file-o"></i><br>';
					icon_out += icon_data.name + '</div>'
				}
				else {
					icon_out = '<tr><td><i class="fas fa-file-o"></i>&nbsp;' + icon_data.name + '</td>';
					icon_out += '<td data-sort="'+ icon_data.modified + '">' + moment(icon_data.modified).format('ddd, MMM do, YYYY') + '</td>';
					icon_out += '<td data-sort="'+ icon_data.size + '">' + self.human_size(icon_data.size) + '</td></tr>';
				}
			}
			return icon_out;
		},
		list:function(folder, refresh, options) {
			var self = this;
			options = options || {};
			var listpane = this.frame.find('#cvclistcontent');
			var viewtype = options.view || listpane.data('view') || 'icons';
			if(options.view && options.view !== listpane.data('view')) {
				refresh = true;
			}

			if(refresh) {
				listpane.html('');
				if(viewtype == 'icons') {
					listpane.append('<div class="row"></div>');
				}
				else {
					listpane.append('<table width="100%" class="table table-striped"><tr><th>Name</th><th>Modified</th>' +
						'<th>Size</th></tr>');
				}
			}

			if(viewtype == 'icons') {
				listpane.data('view-type', 'icons')
				listpane = listpane.find('.row');

			}
			else {
				listpane.data('view-type', 'list');
				listpane.wrap('<div class="table-responsive">');
				listpane = listpane.find('table');
			}

			$('.cvview').each(function(idx) {
				if($(this).data('view-type') === viewtype) {
					$(this).addClass('active');
				}
				else {
					$(this).removeClass('active');
				}
			});

			$.getJSON(self.options.list_files_url, function(resp) {
				var ico_count = 0;
				$.each(resp.files, function(idx, obj) {
					listpane.append(self.create_icon(obj, viewtype));
					ico_count ++;
					if(ico_count === 4 && viewtype === 'icons') {
						ico_count = 0;
						var newpane = $('<div class="row"></div>');
						listpane.parent().append(newpane);
						listpane = newpane;
					}
				});
				// here because it needs to be after the icons load
				if(refresh) {
					listpane.parent().append('<div class="clearfix"></div>');
				}
			});
		},
		progress:function(percent) {
			$('.cvcprogress').find('.progress-bar').attr('aria-valuenow', percent);
			$('.cvcprogress').find('.progress-bar').css('width',percent + '%');
		},
		upload:function(files, callback_success) {
			var self = this;

			if(typeof callback_success !== 'function') {
				callback_success = function(data) {
					$('.cvcdropmessage').show();
					$('.cvcprogress').hide();
					self.list('/', true);
					$('a[href="#cvclistview"]').click();
				};
			}

			if(files.length < 1) {
				return self.options.error('No files were selected for upload');
			}

			var fd = new FormData();
			var total_size = 0;
			$.each(files, function(idx, f) {
				fd.append( self.upload_field, f )
				total_size += f.size;
			});

			$('.cvcdropmessage').hide();
			$('.cvcprogress').show();
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
				success: callback_success,
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
		select: function(obj, file) {
			this.$elem.val(file);
			this.close_browser();
		},
		close_browser: function(obj) {
			$('a[href="#cvclistview"]').click(); // ensure we're on the list view
			$('#cvc-container').modal('hide');
		},
		open_browser: function(obj) {
			var frame = null;
			var self = this;

			if( !this.options.modal ) {
				frame = window.open('/frame.html','cvc-container','width='+this.options.width+',height='+this.options.height+',menubar=no,location=no,resizable=yes,scrollbars=yes,status=no');
				frame.document.$('body').cvcommander = this;
				frame.document.$('body').append(this.frame_html);

				frame.close( function() {
					self.frame = null;
				});
				this.frame = frame.document.$('body');
				this.list('/', true);
			}
			else {
				if(self.frame) {
					$('#cvc-container').modal('show');
					return;
				}

				frame = $('<div id="cvcframe" />');
				frame.append(this.frame_html);
				$(document.body).append(frame);

				$(document).on('dragenter', function(e) {
					_clean_event(e);
				});
				$(document).on('dragover', function(e) {
					_clean_event(e);
				});
				$(document).on('click', '.cvview', function(e) {
					var folder = $(this).data('folder') || '/';
					self.list(folder, true, {view:$(this).data('view-type')})
				});
				$(document).on('dragenter','#cvclistview', function(e) {
					_clean_event(e);
					$('a[href="#cvcupload"]').click(); // ugly hack
					self.back_to_list = true;
				});

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

				$(document).on('click', '.cvc-file', function(e) {
				   e.preventDefault();
				   var file = $(this).attr('data-link');
				   self.select(this, file);
                });

				$('#cvc-container').modal('show');
				self.frame = frame;
				self.list('/', true)
			}
		},
	};

	$.fn.cvcommander = function(arg1, arg2, arg3) {
		var method = 'init';
		var options = {};
		if(typeof arg1 === 'object' && !arg2) {
			options = arg1;
		}
		else if(typeof arg1 === 'string' && typeof arg2 === 'object') {
			method = arg1;
			options = arg2;
		}
		else if(typeof arg1 === 'string') {
			method = arg1;
		}

		var results = [];
		this.each( function() {
			if($(this).data('cvcommander') && method == 'init') {
				method = 'open_browser';
			}

			if(method === 'init' || !$(this).data('cvcommander')) {
				var _cvcommander = new cvCommander(this, options);
				_cvcommander.init(options);
				$(this).data('cvcommander', _cvcommander);
				results.push(_cvcommander);
			}
			else {
				// try to call the method
				var _cvcommander_c = $(this).data('cvcommander');
				try {
					results.push(_cvcommander_c[method](arg2, arg3))
				}
				catch(e) {
					console.error('invalid method call "' + method)
				}
			}
		});
		return results;
	}

}( jQuery, window, document ));
