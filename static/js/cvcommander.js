;(function( $, window, document, undefined ) {
	let plugin_name = "cvCommander",
		defaults = {
			width: 600,
			height: 400,
			upload_url: '/cvc/upload',
			upload_field: 'uploads',
			allow_inline_drop: true,
			list_files_url: '/cvc/list',
			create_folder_url: '/cvc/create/folder',
			copy_file_url: '/cvc/copy',
			rename_file_url: '/cvc/rename',
			path: '/',
			modal: true,
			modal_css: null,
			button_class: 'btn btn-light',
			button_text: '',
			fa_version: 5,
			bs_version: 4,
			fa_variant: 'regular',
			fa_icons: {
				openCommander: 'fa-camera',
				iconView: 'fa-th-large',
				listView: 'fa-th-list',
				closeCommander: 'fa-times',
				useFile: 'fa-check-circle',
				viewFile: 'fa-eye',
				copyFile: 'fa-copy',
				moveFile: 'fa-arrows-alt',
				deleteFile: 'fa-trash-alt',
				pasteFile: 'fa-paste',
				closeView: 'fa-window-close',
				folder: 'fa-folder',
				createFolder: 'fa-folder-plus',
				browse: 'fa-folder-open',
				upload: 'fa-cloud-upload',
				home: 'fa-home',
				folderBack: 'fa-arrow-left'

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
				'text/csv': 'file-csv',
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

	const _clean_event = function(e) {
		e.stopPropagation();
		e.preventDefault();
	};

	const cvCommander = function ( element, config ) {
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

			// setup some classes depending on BS version
			this.bs_frame_class = 'card';
			this.bs_header_class = 'card-header';
			this.bs_body_class = 'card-body';
			if(this.options.bs_version === 3) {
				this.bs_frame_class = 'panel panel-default';
				this.bs_header_class = 'panel-header';
				this.bs_body_class = 'panel-body';
			}

			/* create modal */
			let $frame, $modal, $header, $body;
			if(this.options.modal) {
				$frame = $('<div>').attr('id', 'cvc-container').addClass('modal fade');
				$modal = $('<div>').addClass('modal-content');
				$header = $('<div>').addClass('modal-header')
				$body = $('<div>').addClass('cvc-modal-body modal-body')
			}
			else {
				$frame = $('<div>').attr('id', 'cvc-container');
				$modal = $('<div>').addClass(this.bs_frame_class);
				$header = $('<div>').addClass(this.bs_header_class);
				$body = $('<div>').addClass('cvc-modal-body ' + this.bs_body_class)
			}

			$header.append(
				$('<ul>').addClass('nav nav-tabs').attr('role', 'tablist').prop(
					'id', 'cvcmaintabs').append(
					$('<li>').addClass('nav-item').append(
						$('<a>').attr({id: 'browsetab', href: '#cvclistview', role: 'tab', 'data-toggle': 'tab'})
							.addClass('nav-link active')
							.append($('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.browse), ' Browse')
					),
					$('<li>').attr('role', 'presentation').append(
						$('<a>').addClass('nav-link').attr({href: '#cvcupload', role: 'tab', 'data-toggle': 'tab'})
							.append($('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.upload), ' Upload')
					)
				),
				$('<button>').addClass('close').attr({type:'button', 'aria-label': 'Close', 'data-dismiss': 'modal'})
					.append($('<i>').addClass(this._fa_base_class + ' fa-sm ' + this.options.fa_icons.closeCommander))
			);

			let $path_btns = $('<div>').addClass('btn-group btn-group-sm').append(
				$('<button>').attr('type', 'button').addClass('btn btn-sm btn-default cvview').data('folder', '/').append(
					$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.home)
				),
				$('<button>').attr('type', 'button').addClass('btn btn-sm btn-default cvc-back cvview disabled').append(
					$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderBack)
				),
				$('<div>').addClass('cvc-path-btns btn-group').append(
					$('<button>').addClass('btn btn-sm btn-default dropdown-toggle disabled').attr({
						type: 'button', id: 'cvc-pathtree', 'aria-haspopup': 'dropdown', 'data-toggle': 'dropdown'
					}).text('[root]/'),
					$('<div>').addClass('dropdown-menu').attr('aria-labelledby', 'cvc-pathtree')
				),
				$('<button>').attr('type', 'button').addClass('btn btn-sm btn-default cvc-create-folder').append(
					$('<span>').addClass('cvc-folder').append(
						$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.createFolder)
					),
				),
			);

			let $toolbar = $('<div>').attr('id', 'cvclist-toolbar').append(
				$('<div>').addClass('btn-group').append(
					$('<a>').attr({href: '#', name: 'Icon View'}).data('view-type', 'icons').addClass(
						'cvview btn btn-sm btn-light disabled'
					).append($('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.iconView)),
					$('<a>').attr({href: '#', name: 'List View'}).data('view-type', 'list').addClass(
						'cvview btn btn-sm btn-light disabled'
					).append($('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.listView))
				),
				$('<span>').addClass('cvc-vertical-sep').html('&nbsp;|&nbsp;'),
				$path_btns,
				$('<span>').addClass('cvc-vertical-sep').html('&nbsp;|&nbsp;'),
				$('<div>').addClass('btn-group').append(
					$('<a>').attr({href: '#', name: 'Use'}).addClass('btn btn-sm btn-light cvc-use disabled cvc-file-opt').append(
						$('<span>').addClass('cvc-select-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.useFile)
						)
					),
					$('<a>').attr({href: '#', name: 'Preview'}).addClass('btn btn-sm btn-light cvc-view disabled cvc-file-opt').append(
						$('<span>').addClass('cvc-view-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.viewFile)
						)
					),
					$('<a>').attr({href: '#', name: 'Copy'}).addClass('btn btn-sm btn-light cvc-copy disabled cvc-file-opt').append(
						$('<span>').addClass('cvc-copy-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.copyFile)
						)
					),
					$('<a>').attr({href: '#', name: 'Paste'}).addClass('btn btn-sm btn-light cvc-paste disabled cvc-file-opt').append(
						$('<span>').addClass('cvc-paste-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.pasteFile)
						)
					),
					$('<a>').attr({href: '#', name: 'Rename'}).addClass( 'btn btn-sm btn-light cvc-move disabled cvc-file-opt').append(
						$('<span>').addClass('cvc-move-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.moveFile)
						)
					),
					$('<a>').attr({href: '#', name: 'Delete'}).addClass( 'btn btn-sm btn-light cvc-delete disabled cvc-file-opt').append(
						$('<span>').addClass('cvc-trash-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.deleteFile)
						)
					)
				)

			);
			let $preview = $('<div>').addClass('container text-center').attr('id', 'cvc-view-file').css({
				display: 'none'
			});

			$body.append(
				$('<div>').addClass('cvc-modal-modal'),
				$('<div>').addClass('tab-content').append(
					$('<div>').addClass('tab-pane active').attr('id', 'cvclistview').append(
						$toolbar,
						$('<div>').attr('id', 'cvclistcontent').addClass('container'),
						$preview
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

			let $dialog = $('<div>').attr('role', 'document').addClass('modal-dialog modal-lg').append($modal);
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
			let button = $('<button />');
			button.attr('type', "button");
			button.addClass(this.options.button_class);
			
			let _markup = '';
			if( this.options.fa_icons.openCommander ) {
				_markup += '<i class="' + this._fa_base_class + ' ' + this.options.fa_icons.openCommander + '"></i>';
				if( this.options.button_text ) {
					_markup += " ";
				}
			}

			let self = this;
			_markup += this.options.button_text;
			if( _markup ) {
				button.html(_markup)
			}

			button.on('click', function(e) {
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
				let swap_inline = function(e, container, show_hide) {
					_clean_event(e);
					let cvcinput = $(container).find('.cvcinput');
					let cvcinline = $(container).find('.cvcupload-inline');

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
					let container = $(e.target).closest('.cvccontainer');
					if(e.target === this) {
						swap_inline(e, container, 'hide');
					}
				});

				$(document).on('dragend', function(e) {
					// try to ensure this always closes if we're not dragging
					swap_inline(e, '.cvcontainer', 'hide');
				});

				$(document).on('drop', '.cvcupload-inline', function(e) {
					e.preventDefault();
					let files = e.originalEvent.dataTransfer.files;
					let ipt = $(this).parent().find('.cvcinput');
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
			let labels = ['B', 'K', 'M', 'G'];
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
		_detect_icons: function(icon_data) {
			let self = this;
			let icon_lg, icon_sm;
			$.each(self.options.icons, function(rule, icon_name) {
				let rrule = new RegExp(rule);
				if(icon_data.type.match(rrule) || icon_data.type === rule) {
					icon_lg = icon_name;
					icon_sm = icon_name;
					if(Array.isArray(icon_name)) {
						icon_lg = icon_name[0];
						icon_sm = icon_name[1];
					}
					return false;
				}
			});
			if(!icon_lg) {
				icon_lg = 'file';
			}
			if(!icon_sm) {
				icon_sm = 'file'
			}
			return {lg: icon_lg, sm: icon_sm};
		},
		_build_icon_html: function(icon_data, view_type, icon_lg, icon_sm, options) {
			if(typeof options != 'object') {
				options = {};
			}
			let defaults = {
				maxWidth: '4em',
				maxHeight: '3em',
				height: '3em',
				faSize: 'fa-3x',
				iconClass: 'col-md-3 text-center',
				fontSize: 'inherit'
			};

			let icon_config = $.extend({}, defaults, options);
			let icon_out = null;
			let self = this;
			let ico_cls = 'cvc-file';
			if(icon_data.type === 'dir') {
				ico_cls += ' cvview';
			}
			else {
				ico_cls += ' cvc-file-info';
			}

			if(view_type === 'icons') {

				if(icon_config.iconClass) {
					ico_cls += ' ' + icon_config.iconClass;
				}
				icon_out = $('<div>').addClass(ico_cls).data({
					link: icon_data.url,
					icon_data: icon_data,
				}).css('font-size', icon_config.fontSize)

				if(icon_lg === 'self') {
					icon_out.append($('<img>').attr({src: icon_data.url, alt: icon_data.name}).css({
						maxWidth: icon_config.maxWidth,
						maxHeight: icon_config.maxHeight,
						height: icon_config.height
					}))
				}
				else {
					icon_out.append($('<i>').addClass(
						self._fa_base_class + ' ' + icon_config.faSize + ' fa-' + icon_lg))
				}
				icon_out.append(
					$('<br>'),
					$('<span>').addClass('cvc-f-name cvc-f-name-font').text(icon_data.name)
				)
				if(icon_sm) {
					icon_out.addClass('cvc-' + icon_sm);
				}
			}
			else {
				icon_out = $('<tr>').addClass(ico_cls).data(
					{'link': icon_data.url, icon_data: icon_data}
				).append(
					$('<td>').addClass('cvc-' + icon_sm).append(
						$('<i>').addClass(self._fa_base_class + ' fa-' + icon_sm),
						$('<span>').addClass('cvc-f-name-font').text(' ' + icon_data.name)
					),
					$('<td>').data('sort', icon_data.modified).text(moment.unix(icon_data.modified).format(
						'ddd, MMM do, YYYY')
					),
					$('<td>').data('sort', icon_data.size).text(self.human_size(icon_data.size))
				)
			}
			if(icon_data.type === 'dir') {
				icon_out.data('folder', icon_data.full_path)
			}
			return icon_out;
		},
		create_icon: function(icon_data, view_type, options) {
			if(!view_type) {
				view_type = 'icons';
			}
			let self = this;
			let icon_info = self._detect_icons(icon_data);
			return self._build_icon_html(icon_data, view_type, icon_info.lg, icon_info.sm, options);
		},
		list:function(folder, refresh, options) {
			$('#cvclistcontent').show();
			$('#cvclist-toolbar .cvc-file-opt').addClass('disabled');
			let self = this;
			options = options || {};
			let listpane = this.frame.find('#cvclistcontent');
			let viewtype = options.view || listpane.data('view') || 'icons';
			listpane.data('view', viewtype);

			self.selected = null;
			self.current_folder = folder;

			let f_name = '[root]/';
			if(folder !== '/') {
				f_name = folder + '/';
			}

			// set the path button paths
			let $path_btns = listpane.closest('.cvc-modal-body').find('.cvc-path-btns');
			$path_btns.find('.dropdown-toggle').empty().append(
				$('<span>').addClass('cvc-folder').append(
					$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.folder)
				),
				' ' + f_name
			)

			let build_path = '';
			let paths = folder.split('/');
			let prev_path = paths[paths.length - 2];
			if(typeof prev_path === 'undefined') {
				listpane.closest('.cvc-modal-body').find('.cvc-back').addClass('disabled')
			}
			else {
				listpane.closest('.cvc-modal-body').find('.cvc-back').removeClass('disabled').data('folder', prev_path);
			}

			// make sure the tree is empty and starts with root
			$path_btns.find('.dropdown-menu').empty().append(
				$('<a>').attr('href', '#').addClass('dropdown-item cvview').append(
					$('<span>').addClass('cvc-folder').append(
						$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.folder)
					),
					' [root]/'
				)
			)

			// set tree paths
			$.each(paths, function(idx, path) {
				if(path && path !== '/') {
					path += '/'

					build_path += path;
					let active = '';
					if(path === folder) {
						active = ' active'
					}
					$path_btns.find('.dropdown-menu').append(
						$('<a>').attr('href', '#').addClass('dropdown-item cvview' + active).data(
							'folder', build_path).append(
							$('<span>').addClass('cvc-folder').append(
								$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.folder)
							),
							' ', path
						)
					)
				}
			});

			// enable the dropdown
			$path_btns.find('.dropdown-toggle').removeClass('disabled');
			$(self.frame).find('.cvview').removeClass('disabled');

			// set the paste button path
			$(self.frame).find('.cvc-paste').data('folder', folder);

			// if we have a copied file, enable the paste button
			console.log(self.copied_file);
			if(self.copied_file) {
				console.log($(self.frame))
				$(self.frame).find('.cvc-paste').removeClass('disabled');
			}

			if(options.view && options.view !== listpane.data('view')) {
				refresh = true;
			}

			$('#cvc-view-file').empty().hide();

			if(refresh) {
				listpane.empty();
				if(viewtype == 'icons') {
					listpane.append($('<div>').addClass('row'));
				}
				else {
					listpane.append(
						$('<table>').addClass('table table-striped').append(
							$('<tr>').append(
								$('<th>').text('Name'),
								$('<th>').text('Modified'),
								$('<th>').text('Size')
							)
						)
					)
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

			if(refresh) {
				$.getJSON(self.options.list_files_url, {path: folder}, function (resp) {
					let ico_count = 0;
					if(resp.files.length < 1) {
						listpane.append(
							$('<div>').css({
								minHeight: '100px',
								margin: '0 auto'
							}).addClass('text-center text-muted').text(
								'This folder is empty'
							)
						)
					}
					else {
						$.each(resp.files, function (idx, obj) {
							listpane.append(self.create_icon(obj, viewtype));
							ico_count++;
							if (ico_count === 4 && viewtype === 'icons') {
								ico_count = 0;
								let newpane = $('<div class="row"></div>');
								listpane.parent().append(newpane);
								listpane = newpane;
							}
						});
					}
					// here because it needs to be after the icons load
					listpane.parent().append('<div class="clearfix"></div>');

					// not using event because this is needed internally
					if(typeof options.refresh_callback === "function") {
						options.refresh_callback(resp.files)
					}
					$('#browsetab').tab('show');
				});
			}
			else {
				$('#browsetab').tab('show');
			}
		},
		progress:function(percent) {
			$('.cvcprogress').find('.progress-bar').attr('aria-valuenow', percent);
			$('.cvcprogress').find('.progress-bar').css('width',percent + '%');
		},
		upload:function(files, callback_success) {
			let self = this;

			if(typeof callback_success !== 'function') {
				callback_success = function(data) {
					$('.cvcdropmessage').show();
					$('.cvcprogress').hide();
					let _uploaded = null;
					if(data.files.length > 0) {
						_uploaded = data.files[0];
					}
					self.list(self.current_folder || '/', true, {
						refresh_callback: function(_files) {
							$('.cvc-file').each(function(idx) {
								if($(this).data('link') === _uploaded) {
									self.select(this, _uploaded);
									return false;
								}
							})
						}
					});
				};
			}

			if(files.length < 1) {
				return self.options.error('No files were selected for upload');
			}

			let fd = new FormData();
			let total_size = 0;
			console.log(files);
			$.each(files, function(idx, f) {
				fd.append( self.upload_field, f )
				total_size += f.size;
			});

			$('.cvcdropmessage').hide();
			$('.cvcprogress').show();
			$.ajax( {
				xhr: function() {
					let xhrobj = new window.XMLHttpRequest();
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
				url: self.options.upload_url + '?path=' + self.current_folder,
				type: 'POST',
				contentType: false,
				processData: false,
				data: fd,
				success: callback_success,
				error: function(jqXHR, txtstatus, err) {
					self.options.error(txtstatus, err);
				}
			})
		},
		_modal_modal: function(title, content) {
			$('.cvc-modal-modal').empty().hide();

			$('.cvc-modal-modal').append(
				$('<div>').addClass(this.bs_frame_class + ' cvc-modal-modal-content').css(
					{
						width: '650px', 'background-color': 'white', 'z-index': 9999, margin: '0 auto'
					}).append(
					$('<div>').addClass(this.bs_header_class).append(title),
					$('<div>').addClass(this.bs_body_class).append(content)
				)
			).show();
		},
		create_folder_modal: function(path) {
			let self = this;
			this._modal_modal('New Folder',
				$('<form>').addClass('cvc-create-folder-frm').append(
					$('<input>').attr({type: 'hidden', name: 'path'}).val(path),
					$('<div>').addClass('form-group').append(
						$('<label>').text('Enter a folder name: '),
						$('<input>').attr('name', 'name').addClass('cvc-create-folder-name form-control')
					),
					$('<div>').addClass('text-center').append(
						$('<button>').attr({type: 'submit'}).addClass('btn btn-primary').append(
							$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.createFolder),
							' Create'
						),
						'&nbsp;',
						$('<button>').attr({type: 'button'}).addClass('btn btn-default cvc-cancel-model2x').append(
							$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.closeView),
							' Cancel'
						)
					)
				)
			)
		},
		cvc_alert: function(sel, msg, options) {
			console.log(sel);

			let defaults = {
				timeout: 0,
				type: 'danger'
			};
			let aconfig = $.extend({}, defaults, options);
			$(sel).prepend(
				$('<div>').addClass('alert alert-' + aconfig.type).text(msg)
			);
			if(aconfig.timeout > 0) {
				setTimeout(function() {
					$(sel).find('.alert').fadeOut(500, function() {
						$(this).remove();
					})
				}, aconfig.timeout)
			}
		},
		create_folder: function($mm, name, path) {
			let self = this;
			let $sel = $mm.find('.cvc-modal-modal-content').find(self.bs_body_class)
			$.ajax(self.options.create_folder_url, {
				contentType: 'application/json;charset=UTF-8',
				data: JSON.stringify({name: name, path: path}),
				error: function(jqxhr, textstatus, err) {
					self.cvc_alert($sel, textstatus)
					console.log(err)
				},
				method: 'POST',
				success: function(output) {
					if(output.status === 'OK') {
						$mm.hide();
						self.list(path, true);
					}
					else {
						self.cvc_alert($sel, output.message || 'Bad status when creating folder.')
					}
				}
			});
		},
		copy: function(obj) {
			let self = this;
			self.copied_file = $(obj).data('icon_data');
			$(self.frame).find('.cvc-paste').removeClass('disabled');
			self.cvc_alert($(self.frame).find('.cvc-modal-body'), 'Copied!', {
				type: 'success',
				timeout: 3000
			})
		},
		safe_file_name: function(file) {
			// todo this is not at all perfect but will be a start
			return file.replace(/[^A-Za-z0-0\-\@=\s_]+/, '_');
		},
		paste: function(path) {
			let self = this;
			console.log(self.copied_file);
			if(self.copied_file) {
				let $sel = $(self.frame).find('.cvc-modal-body');
				$.ajax(self.options.copy_file_url, {
					contentType: 'application/json;charset=UTF-8',
					data: JSON.stringify({dest: path, file_data: self.copied_file}),
					error: function(jqxhr, textstatus, err) {
						self.cvc_alert($sel, textstatus || 'unable to paste', {timeout: 3000});
						console.log(err);
					},
					method: 'POST',
					success: function(output) {
						console.log(output);
						if(output.status === 'OK') {
							self.copied_file = null;
							self.list(path, true, {
								refresh_callback: function(_files) {
									$('.cvc-file-info').each(function(idx) {
										if($(this).data('link') === output.file) {
											self.select(this, output.file)
										}
									})
								}
							});
							self.cvc_alert($(self.frame).find('.cvc-modal-body'), 'Pasted!', {type: 'success'})
						}
						else {
							self.cvc_alert($sel, output.message || 'Bad status when pasting file')
						}
					}
				});
			}
		},
		rename: function(obj) {
			let self = this;
			let $fname_sel = $(obj).find('.cvc-f-name');
			let fname = $fname_sel.text();
			$fname_sel.empty().append(
				$('<input>').attr({name: 'new-name', type: 'text'}).val(fname).on('blur', function(e) {
					e.preventDefault();
					$.ajax(self.options.rename_file_url, {
						contentType: 'application/json;charset=UTF-8',
						data: JSON.stringify({file_data: $(obj).data('icon_data'), new_name: $(this).val()}),
						error: function(jqxhr, textstatus, err) {
							console.log(err);
							self.cvc_alert($(self.frame).find('.cvc-modal-body'), textstatus);
						},
						method: 'POST',
						success: function(output) {
							if(output.status === 'OK') {
								$fname_sel.empty().text(output.new_name)
								self.select(obj, output.link);
							}
							else {
								self.cvc_alert($(self.frame).find('.cvc-modal-body'), output.message || 'Unable to rename file.');
							}
						}
					})
				}).on('keyup', function(e) {
					if(e.which === 13) {
						$(this).trigger('blur');
					}
				})
			);
			$fname_sel.find('input').trigger('focus').trigger('select')
		},
		remove: function(obj, file) {
		},
		mk_context_action: function(_link, _class, _text, _icon, obj, file, _type) {
			let class_type = 'list-group-item list-group-item-action';
			if(_type === 'preview') {
				class_type = 'btn btn-default'
			}
			return $('<a>').attr('href', _link).addClass(class_type + ' ' + _class).append(
				$('<i>').addClass(this._fa_base_class + ' ' + _icon),
				' ' + _text
			).data({filedom: obj, link: file});
		},
		context: function(obj, file, x, y) {
			if($('.cvc-modal-modal').is(':visible')) {
				return false;
			}

			// create the context menu
			let self = this;
			let filename = $(obj).data('icon_data').name;
			$('.cvccontext').remove();
			let ctx_menu = $('<div>').addClass('cvccontext').css({
				position:'absolute', top: y, left: x, backgroundColor: 'white', zIndex: '99999', width:'11rem'}).append(
					$('<div>').addClass('list-group').append(
						$('<div>').addClass('list-group-item list-group-item-dark cvc-file').text(filename),
						self.mk_context_action('#', 'cvc-use', 'Use', self.options.fa_icons.useFile, obj, file),
						self.mk_context_action('#', 'cvc-view', 'Preview', self.options.fa_icons.viewFile, obj, file),
						self.mk_context_action('#', 'cvc-copy', 'Copy', self.options.fa_icons.copyFile, obj, file),
						self.mk_context_action('#', 'cvc-move', 'Rename', self.options.fa_icons.moveFile, obj, file),
						self.mk_context_action('#', 'cvc-delete', 'Delete', self.options.fa_icons.deleteFile, obj, file)
					)
			);
			$(self.frame).append(ctx_menu);
		},
		view: function(obj, file) {
			let self = this;
			$('#cvclistcontent').hide();
			if($(obj).data('filedom')) {
				obj = $(obj).data('filedom');
			}

			$('#cvc-view-file').append(
				$('<div>').append(
					self.mk_context_action('#', 'cvc-use', 'Use', self.options.fa_icons.useFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvc-copy', 'Copy', self.options.fa_icons.copyFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvc-move', 'Rename', self.options.fa_icons.moveFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvc-delete', 'Delete', self.options.fa_icons.deleteFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvview', 'Close Preview', self.options.fa_icons.closeView, obj, file, 'preview')
				),
				$('<div>').addClass('center-block text-center').append(
					this.create_icon($(obj).data('icon_data'), 'icons', {
						maxHeight: '70%',
						maxWidth: '70%',
						height: 'auto',
						faSize: 'fa-2x',
						iconClass: 'text-center',
						fontSize: '3rem'
					})
				)
			).show();
		},
		usefile: function(obj, file) {
			$('#cvc-view-file').empty().hide();
			// this.list('/')
			this.$elem.val(file);
			this.close_browser();
		},
		select: function(obj, file) {
			let self = this;
			$('.cvc-selected').removeClass('cvc-selected');

			$(obj).addClass('cvc-selected');
			$('#cvclist-toolbar').find('.cvc-file-opt').each(function(idx) {
				if(($(this).hasClass('cvc-paste') && self.copied_file) || !$(this).hasClass('cvc-paste')) {
					$(this).data({filedom: obj, link: file, icon_data: $(obj).data('icon_data')}).removeClass('disabled')
				}
			})
			self.selected = $(obj);
		},
		close_browser: function(obj) {
			// this.list('/');
			$('#cvc-container').modal('hide');
		},
		open_browser: function(obj) {
			let frame = null;
			let self = this;

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

				$(frame).on('click', '.cvview', function(e) {
					e.preventDefault();
					let folder = $(this).data('folder') || '/';
					let viewtype = $(this).data('view-type') || self.frame.find('#cvclistcontent').data('view') || 'icons';
					self.list(folder, true, {view: viewtype})
				});

				$(frame).on('click', '.cvc-create-folder', function(e) {
					e.preventDefault();
					self.create_folder_modal($('#cvclistview').data('folder') || '/');
				});

				$(frame).on('click', '.cvc-copy', function(e) {
					e.preventDefault();
					self.copy($(this).data('filedom'));
				})

				$(frame).on('dragenter','#cvclistview', function(e) {
					_clean_event(e);
					$('a[href="#cvcupload"]').trigger('click'); // ugly hack
					self.back_to_list = true;
				});

				$(frame).on('dragenter, dragover','#cvcupload',function(e) {
					$('#cvcupload').removeClass('text-muted');
					_clean_event(e);
				});

				$(frame).on('dragleave','#cvcupload',function(e) {
					$('#cvcupload').addClass('text-muted');
					if( self.back_to_list ) {
						$('a[href="#cvclistview"]').trigger('click');
					}
				});

				$(frame).on('drop','#cvcupload',function(e) {
					e.preventDefault();
					$('#cvcupload').addClass('text-muted');
					let files = e.originalEvent.dataTransfer.files;
					self.upload( files );
				});

				// for fallback reasons
				$(document).on('change', '#cvcuploadinput', function(e) {
					_clean_event(e);
					self.upload(this.files);
				});

				$(frame).on('click', '.cvc-file-info', function(e) {
				    e.preventDefault();
				    self.select(this, $(this).data('link'))
                });

				$(frame).on('click', '.cvc-use', function(e){
					e.preventDefault();
					//let file = $(this).data('link');
					let file = $(this).data('link');
					self.usefile($(this).data('filedom'), file);
				});

				$(frame).on('click', '.cvc-view', function(e) {
					e.preventDefault();
					let file = $(this).data('link');
					self.view(this, file);
				})

				$(frame).on('click', function(e) {
					$('.cvccontext').remove();
				});

				$(frame).on('click', '.cvc-cancel-model2x', function(e) {
					$(this).closest('.cvc-modal-modal').hide();
				})

				$(frame).on('contextmenu', '.cvc-file-info', function(e) {
					e.preventDefault();
					let file = $(this).data('link');
					self.context(this, file, e.clientX, e.clientY);
				});

				$(frame).on('submit', '.cvc-create-folder-frm', function(e) {
					e.preventDefault();
					self.create_folder($(this).closest('.cvc-modal-modal'),
						$(this).find('input[name=name]').val(),
						$(this).find('input[name=path]').val()
					)
				});

				$(frame).on('click', '.cvc-paste', function(e) {
					e.preventDefault();
					if(self.copied_file) {
						self.paste($(this).data('folder') || '/')
					}
				});

				$(frame).on('click', '.cvc-move', function(e) {
					e.preventDefault();
					self.rename($(this).data('filedom'));
				});

				$(document).on('keydown', function(e) {
					if(self.selected && e.which === 67 && (e.metaKey || e.ctrlKey)) {
						self.copy(self.selected);
					}
					else if(self.copied_file && e.which === 86 && (e.metaKey || e.ctrlKey)) {
						self.paste(self.current_folder);
					}
				})

				$('#cvc-container').modal('show');
				self.frame = frame;
				self.list('/', true)
			}
		},
	};

	$.fn.cvcommander = function(arg1, arg2, arg3) {
		let method = 'init';
		let options = {};
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

		let results = [];
		this.each( function() {
			if($(this).data('cvcommander') && method === 'init') {
				method = 'open_browser';
			}

			if(method === 'init' || !$(this).data('cvcommander')) {
				let _cvcommander = new cvCommander(this, options);
				_cvcommander.init(options);
				$(this).data('cvcommander', _cvcommander);
				results.push(_cvcommander);
			}
			else {
				// try to call the method
				let _cvcommander_c = $(this).data('cvcommander');
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
