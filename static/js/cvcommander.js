// noinspection JSDeprecatedSymbols

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
			remove_file_url: '/cvc/remove',
			path: '/',
			modal: true,
			modal_css: null,
            button_class: null,
			button_text: '',
			render_browse: true,
			fa_version: 5,
			bs_version: 4,
			fa_variant: 'free',
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
				pasteFile: 'fa-clipboard',
				closeView: 'fa-window-close',
				folder: 'fa-folder',
				createFolder: 'fa-folder-plus',
				browse: 'fa-folder-open',
				upload: 'fa-upload',
				home: 'fa-home',
				folderBack: 'fa-arrow-left',
				confirmYes: 'fa-check-circle',
				confirmNo: 'fa-ban',
				folderSort: 'fa-sort',
				folderSortAsc: 'fa-sort-amount-up',
				folderSortDesc: 'fa-sort-amount-down',
				folderHeaderSortAsc: 'fa-sort-up',
				folderHeaderSortDesc: 'fa-sort-down',
				search: 'fa-search',
				clearSearch: 'fa-times',
				loading: 'fa-spinner'
			},
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
			},
			events: {
				'cvc.useFile': function(e, data) {
					data.cvc.$elem.val(data.file);
				}
			}
		};

	const _clean_event = function(e) {
		e.stopPropagation();
		e.preventDefault();
	};

	const cvcID = function() {
		// taken from https://gist.github.com/gordonbrander/2230317
		// Math.random should be unique because of its seeding algorithm.
		// Convert it to base 36 (numbers + letters), and grab the first 9 characters
		// after the decimal.
		return '_' + Math.random().toString(36).substr(2, 9);
	};

	const cvCommander = function ( element, config ) {
		this.element = element;
		this._defaults = defaults;
		this._name = plugin_name;
		this.config = config;
		this._fa_base_class = "fa";
		this._fa_variants = {free: 'fas', regular: 'far', light: 'fal', duotone: 'fad', solid: 'fas'};
		this._bs_variants = {
			3: {
				btnDefault: 'btn btn-default'
			},
			4: {
				btnDefault: 'btn btn-light'
			}
		}
		this.cached_files = [];

	};

	cvCommander.prototype = {
		init: function() {
			let self = this;
			this.options = $.extend( {}, defaults, this.config );

			this._bs_variant = this._bs_variants[this.options.bs_version];
			if (this.options.button_class === null) {
				this.options.button_class = this._bs_variant.btnDefault;
			}

			if( this.options.file_error_timeout > -1 ) {
				this.options.file_error_timeout *= 1000;
			}

			this.$elem = $(this.element);

			if(this.options.render_browse) {
				if (this.$elem.hasClass('form-control')) {
					this.$elem.wrap($('<div>').addClass('cvcinput input-group'));
					this.$elem.parent().wrap($('<div>').addClass('cvccontainer'));
				} else {
					this.$elem.wrap($('<span>').addClass('cvcinput'));
					this.$elem.parent().wrap($('<span>').addClass('cvccontainer'));
				}
				this.$drop_container = this.$elem.closest('.cvcinput').parent();
			}
			else {
				this.$drop_container = null;
			}

			if(this.options.fa_version > 4) {
				this._fa_base_class = this._fa_variants[this.options.fa_variant];
			}

			// setup some classes depending on BS version
			this.bs_frame_class = 'card';
			this.bs_header_class = 'card-header';
			this.bs_body_class = 'card-body';
			if(this.options.bs_version === 3) {
				this.bs_frame_class = 'panel panel-default';
				this.bs_header_class = 'panel-heading';
				this.bs_body_class = 'panel-body';
			}

			/* create modal */
			let $frame, $modal, $header, $body;
			this.ident = this.options.id || cvcID();

			if(this.options.modal) {
				$frame = $('<div>').addClass('cvc-main-frame modal fade').attr('id', this.ident);
				$modal = $('<div>').addClass('modal-content');
				$header = $('<div>').addClass('modal-header')
				$body = $('<div>').addClass('cvc-modal-body modal-body')
			}
			else {
				$frame = $('<div>').addClass('cvc-main-frame').attr('id', this.ident);
				$modal = $('<div>').addClass(this.bs_frame_class);
				$header = $('<div>').addClass(this.bs_header_class);
				$body = $('<div>').addClass('cvc-modal-body ' + this.bs_body_class)
			}

			this.main_wrapper = $frame;

			let $close_btn = $('<button>').addClass('close').attr(
				{type:'button', 'aria-label': 'Close', 'data-dismiss': 'modal'}).append(
					$('<i>').addClass(
						this._fa_base_class + ' fa-sm ' + this.options.fa_icons.closeCommander));

			if(this.options.bs_version === 3) {
				// bs 3 needs the close button before the tabs :-/
				$header.append($close_btn);
			}

			this.$browse_tab = $('<a>').attr({
				href: '#cvclistview', role: 'tab', 'data-toggle': 'tab', 'data-target': '#' + this.ident + ' .cvc-list-tab'
			}).addClass('nav-link').append(
				$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.browse), ' Browse');

			this.$upload_tab = $('<a>').attr({
				href: '#cvcupload', role: 'tab', 'data-toggle': 'tab', 'data-target': '#' + this.ident + ' .cvc-upload-tab'
			}).append(
				$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.upload), ' Upload'
			)

			$header.append(
				$('<ul>').addClass('nav nav-tabs').attr('role', 'tablist').append(
					$('<li>').addClass('nav-item active').append(
						this.$browse_tab,
					),
					$('<li>').addClass('nav-link').attr('role', 'presentation').append(
						this.$upload_tab
					)
				)
			);

			if(this.options.bs_version !== 3) {
				// bs 4+ needs the close button after the tabs
				$header.append($close_btn);
			}

			let $path_btns = $('<div>').addClass('btn-group btn-group-sm').append(
				$('<button>').attr({type: 'button', title: 'Home'}).addClass('btn btn-sm btn-default cvview').data('folder', '/').append(
					$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.home)
				),
				$('<button>').attr({type: 'button', title: 'Back'}).addClass('btn btn-sm btn-default cvc-back cvview disabled').append(
					$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderBack)
				),
				$('<div>').addClass('cvc-path-btns btn-group').append(
					$('<button>').addClass('btn btn-sm btn-default dropdown-toggle disabled').attr({
						type: 'button', id: 'cvc-pathtree', 'aria-haspopup': 'dropdown', 'data-toggle': 'dropdown'
					}).append(
						$('<b>').text(' / '),
						$('<span>').text('(root)').addClass('text-muted')
					),
					$('<div>').addClass('dropdown-menu').attr('aria-labelledby', 'cvc-pathtree')
				),
				$('<button>').attr({type: 'button', title: 'Create Folder'}).addClass('btn btn-sm btn-default cvc-create-folder').append(
					$('<span>').addClass('cvc-folder').append(
						$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.createFolder)
					),
				),
			);

			let $toolbar = $('<div>').addClass('cvclist-toolbar').append(
				$('<div>').addClass('btn-group').append(
					$('<a>').attr({href: '#', title: 'Icon View'}).data('view-type', 'icons').addClass(
						'cvview btn-sm disabled ' + this._bs_variant.btnDefault
					).append($('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.iconView)),
					$('<a>').attr({href: '#', title: 'List View'}).data('view-type', 'list').addClass(
						'cvview btn-sm disabled ' + this._bs_variant.btnDefault
					).append($('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.listView))
				),
				$('<span>').addClass('cvc-vertical-sep').html('&nbsp;|&nbsp;'),
				$path_btns,
				$('<span>').addClass('cvc-vertical-sep').html('&nbsp;|&nbsp;'),
				$('<div>').addClass('btn-group').append(
					$('<a>').attr({href: '#', title: 'Use / Select'}).addClass(
						'btn-sm cvc-use disabled cvc-file-opt ' + this._bs_variant.btnDefault
					).append(
						$('<span>').addClass('cvc-btn-icon cvc-select-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.useFile)
						)
					),
					$('<a>').attr({href: '#', title: 'Preview'}).addClass(
						'btn-sm cvc-view disabled cvc-file-opt ' + this._bs_variant.btnDefault
					).append(
						$('<span>').addClass('cvc-btn-icon cvc-view-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.viewFile)
						)
					),
					$('<a>').attr({href: '#', title: 'Copy'}).addClass(
						'btn-sm cvc-copy disabled cvc-file-opt ' + this._bs_variant.btnDefault
					).append(
						$('<span>').addClass('cvc-btn-icon cvc-copy-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.copyFile)
						)
					),
					$('<a>').attr({href: '#', title: 'Paste'}).addClass(
						'btn-sm cvc-paste disabled cvc-file-opt ' + this._bs_variant.btnDefault
					).append(
						$('<span>').addClass('cvc-btn-icon cvc-paste-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.pasteFile)
						)
					),
					$('<a>').attr({href: '#', title: 'Rename'}).addClass(
						'btn-sm cvc-move disabled cvc-file-opt ' + this._bs_variant.btnDefault
					).append(
						$('<span>').addClass('cvc-btn-icon cvc-move-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.moveFile)
						)
					),
					$('<a>').attr({href: '#', title: 'Delete'}).addClass(
						'btn-sm cvc-delete disabled cvc-file-opt ' + this._bs_variant.btnDefault
					).append(
						$('<span>').addClass('cvc-btn-icon cvc-trash-color').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.deleteFile)
						)
					)
				),
				$('<span>').addClass('cvc-vertical-sep').html('&nbsp;|&nbsp;'),
				$('<div>').addClass('btn-group btn-group-sm').append(
					$('<button>').attr({
						type: 'button',
						id: 'cvc-sort',
						'aria-haspopup': 'dropdown',
						'data-toggle': 'dropdown',
						title: 'Sort'
					}).addClass('btn btn-sm btn-default dropdown-toggle').append(
						$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderSort)
					),
					$('<div>').addClass('dropdown-menu').attr('aria-labelledby', 'cvc-sort').append(
						$('<li>').append(
						$('<a>').attr('href', '#').addClass('dropdown-item cvc-sort').data(
							{sort: 'name', dir: 'asc'}).append(
								$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderSortAsc),
								' Name Ascending'
							)
						),
						$('<li>').append(
						$('<a>').attr('href', '#').addClass('dropdown-item cvc-sort').data(
							{sort: 'modified', dir: 'asc'}).append(
								$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderSortAsc),
								' Modified Ascending'
						)),
						$('<li>').append(
						$('<a>').attr('href', '#').addClass('dropdown-item cvc-sort').data(
							{sort: 'name', dir: 'desc'}).append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderSortDesc),
							' Name Descending'
						)),
						$('<li>').append(
						$('<a>').attr('href', '#').addClass('dropdown-item cvc-sort').data(
							{sort: 'modified', dir: 'desc'}).append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.folderSortDesc),
							' Modified Descending'
						))
					)
				),
				$('<div>').addClass('input-group input-group-sm').append(
					$('<div>').addClass('input-group-addon input-group-prepend').append(
						$('<span>').addClass('input-group-text').append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.search)
						)
					),
					$('<input>').addClass('cvc-search-input form-control form-control-sm').attr(
						{type: 'text', placeholder: 'Search'}).on('keydown',
						function(e) {
							self.list(self.current_folder, false, {search: $(this).val()})
						}
					),
					$('<span>').addClass('input-group-append input-group-btn').append(
						$('<button>').addClass('btn btn-default').attr('type', 'button').on( 'click',
							function(e) {
								e.preventDefault();
								$(this).closest('.input-group').find('input').val('');
								self.list(self.current_folder, false, {search: ''});
							}
						).append(
							$('<i>').addClass(this._fa_base_class + ' ' + this.options.fa_icons.clearSearch)
						)
					)
				)
			);

			this.toolbar = $toolbar;

			let $preview = $('<div>').addClass('container-fluid text-center cvc-view-file').css({
				display: 'none'
			});

			$body.append(
				$('<div>').addClass('cvc-modal-modal'),
				$('<div>').addClass('tab-content').append(
					$('<div>').addClass('tab-pane active cvc-list-tab').append(
						$toolbar,
						$('<div>').addClass('cvc-list-content-wrapper').append(
							$('<div>').addClass('cvc-list-content')),
						$preview
					),
					$('<label>').addClass('tab-pane text-muted center cvc-upload-tab').append(
						$('<span>').addClass('cvcdropmessage').append('Drop files to upload'),
						$('<input>').attr({type: 'file'}).addClass('cvc-fallback-input').css('display', 'none'),
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
			if(this.options.render_browse) {
				let button = $('<button />');
				button.attr('type', "button");
				button.addClass(this.options.button_class);

				let _markup = '';
				if (this.options.fa_icons.openCommander) {
					_markup += '<i class="' + this._fa_base_class + ' ' + this.options.fa_icons.openCommander + '"></i>';
					if (this.options.button_text) {
						_markup += " ";
					}
				}

				_markup += this.options.button_text;
				if (_markup) {
					button.html(_markup)
				}

				button.on('click', function (e) {
					e.preventDefault();
					self.open_browser();
				});
				let $btn_wrapper = $('<span>');
				if (this.$elem.hasClass('form-control')) {
				    $btn_wrapper.addClass('input-group-btn');
				}
				button.wrap($btn_wrapper);
				this.$elem.after(button.parent());
			}
			else {
				this.options.allow_inline_drop = false; // disable because there's nothing to drop to
			}

			if(this.options.allow_inline_drop) {
				this.$drop_container.append(
					$('<div>').addClass('cvcupload-inline center text-muted').css('display', 'none').append(
						$('<span>').addClass('cvcdropmessage').append('Drop files to upload and select'),
						$('<div>').addClass('progress cvcprogress').css('display', 'none').append(
							$('<div>').append($('<i>').addClass(
								self._fa_base_class + ' ' + 'fa-spin fa-spinner'
							), ' Uploading, please wait.'),
							$('<div>').addClass('progress-bar progress-bar-success').attr(
								{role: 'progressbar', 'aria-valuenow': 60, 'aria-valuemin': 0, 'aria-valuemax': 100}
							).css('width', '0%')
						)
					)
				);
				let swap_inline = function(e, show_hide) {
					_clean_event(e);
					let container = self.$drop_container.parent();
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
					swap_inline(e, 'show');
				});

				$(document).on('dragleave', '.cvccontainer', function(e) {
					if(e.target === this) {
						swap_inline(e, 'hide');
					}
				});

				$(document).on('dragend', function(e) {
					// try to ensure this always closes if we're not dragging
					swap_inline(e,'hide');
				});

				$(document).on('drop', '.cvcupload-inline', function(e) {
					e.preventDefault();
					let files = e.originalEvent.dataTransfer.files;
					let ipt = $(this).parent().find('.cvcinput');

					self.$elem.cvcommander('upload', files, function(data) {
						$('.cvcdropmessage').show();
						$('.cvcprogress').hide();
						swap_inline(e, 'hide')
						self.$elem.val(data.files[0]); // todo should we call usefile?
					});
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
				iter ++;
				return this.human_size(bytes, iter);
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
				iconClass: 'text-center',
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
			let icon_out_data = {
				link: icon_data.url,
				icon_data: icon_data
			}
			if(icon_data.type === 'dir') {
			    icon_out_data['folder'] = icon_data.full_path
			}

			if(view_type === 'icons' || view_type === 'preview') {
				ico_cls += ' cvc-file-icon';

				if(icon_config.iconClass) {
					ico_cls += ' ' + icon_config.iconClass;
				}
				if(view_type === 'preview') {
					icon_out = $('<div>').css('margin', '0 auto')
				}
				else {
					icon_out = $('<div>').addClass('col-md-3');
				}
				let icon_inner = $('<div>').addClass(ico_cls).data(icon_out_data).css('font-size', icon_config.fontSize)
                icon_inner.attr('title', icon_data.full_path);
				icon_out.append(icon_inner);

				if(icon_lg === 'self') {
					icon_inner.append($('<img>').attr({src: icon_data.url, alt: icon_data.name}).css({
						maxWidth: icon_config.maxWidth,
						maxHeight: icon_config.maxHeight,
						height: icon_config.height
					}))
				}
				else {
					icon_inner.append($('<i>').addClass(
						self._fa_base_class + ' ' + icon_config.faSize + ' fa-' + icon_lg))
				}
				let icon_inner_classes = 'cvc-f-name cvc-f-name-font';
				if(view_type === 'preview') {
					icon_inner_classes += ' cvc-f-name-preview-style';
				}
				else {
					icon_inner_classes += ' cvc-f-name-icon-style';
				}
				icon_inner.append(
					$('<br>'),
					$('<span>').addClass(icon_inner_classes).text(icon_data.name)
				)

				if(icon_sm) {
					icon_inner.addClass('cvc-' + icon_sm);
				}
			}
			else {
				ico_cls += ' cvc-file-list-item';
				icon_out = $('<tr>').addClass(ico_cls).data(icon_out_data).append(
					$('<td>').addClass('cvc-' + icon_sm).append(
						$('<i>').addClass(self._fa_base_class + ' fa-' + icon_sm),
						$('<span>').addClass('cvc-f-name-font').text(' ' + icon_data.name)
					),
					$('<td>').data('sort', icon_data.modified).text(moment.unix(icon_data.modified).format(
						'ddd, MMM do, YYYY')
					),
					$('<td>').data('sort', icon_data.size).text(self.human_size(icon_data.size))
				);
				icon_out.attr('title', icon_data.full_path);
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
		_draw_icons_frame: function(files) {
			// draw the icon view.
			let self = this;
			let listpane = this.frame.find('.cvc-list-content').first();
			listpane.empty();
			let	attach = $('<div>').addClass('row');
			listpane.append(attach);
			$.each(files, function (idx, f) {
				if(idx > 0 && (idx % 4) === 0) {
					attach = $('<div>').addClass('row');
					listpane.append(attach);
				}
				attach.append(self.create_icon(f, 'icons'))
			})
		},
		_draw_table_frame: function(files) {
			let self = this;
			let listpane = this.frame.find('.cvc-list-content').first();
			listpane.empty();
			listpane.wrap('<div>').addClass('table-responsive');
			let c_sort = self.current_list_options.sort;
			let c_dir = self.current_list_options.dir;

			let attach = $('<table>').addClass('table table-striped table-hover');
			let header = $('<tr>');
			$.each([{k: 'name', l: 'Name'}, {k: 'modified', l: 'Modified'}, {k:'size', l: 'Size'}], function(idx, obj) {
				let toggle_class = self.options.fa_icons.folderSort;
				if(obj.k === c_sort) {
					if(c_dir === 'asc')	{
						toggle_class = self.options.fa_icons.folderHeaderSortAsc;
					}
					else {
						toggle_class = self.options.fa_icons.folderHeaderSortDesc;
					}
				}
				header.append(
					$('<th>').append(
						$('<button>').addClass(
							'btn btn-sm btn-block text-left cvc-sort-toggle'
						).attr('type', 'button').data({sort: obj.k}).append(
							$('<i>').addClass(self._fa_base_class + ' ' + toggle_class),
							' ' + obj.l
						)
					),
				)
			});
			attach.append(
				$('<thead>').append(header)
			);

			let $tbody = $('<tbody>');

			$.each(files, function (idx, f) {
				$tbody.append(self.create_icon(f, 'list'))
			});
			attach.append($tbody);
			listpane.append(attach);
		},
		list: function(folder, refresh, options) {
			let self = this;
			self.frame.find('.cvc-list-content-wrapper').show();

			// not sure if we need this but just in case
			let listpane = this.frame.find('.cvc-list-content').first();
			listpane.show();

			self.toolbar.find('.cvc-file-opt').addClass('disabled');

			let defaults = {
				sort: 'name',
				dir: 'asc',
				search: ''
			};

			options = $.extend(defaults, self.current_list_options || {}, options || {});
			self.current_list_options = options;

			let viewtype = options.view || listpane.data('view') || 'icons';
			listpane.data('view', viewtype);

			self.selected = null;
			self.current_folder = folder;

			let f_name = '/ (root)';
			if(folder !== '/') {
				f_name = '/' + folder + '/';
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
			let prev_path = paths.slice(0, -1).join('/') || '/';
			let back_btn = listpane.closest('.cvc-modal-body').find('.cvc-back');
			back_btn.data('folder', prev_path);
			if (folder === '/' || prev_path === '') {
				back_btn.addClass('disabled');
			}
			else {
				back_btn.removeClass('disabled');
			}

			// make sure the tree is empty and starts with root
			$path_btns.find('.dropdown-menu').empty().append(
				$('<li>').append(
					$('<a>').attr('href', '#').addClass('dropdown-item cvview').append(
						$('<span>').addClass('cvc-folder').append(
							$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.folder)
						),
						$('<b>').text(' / '),
						$('<span>').text('(root)').addClass('text-muted')
					)
				)
			)

			// set tree paths
            let dropdown_menu = $path_btns.find('.dropdown-menu');
			$.each(paths, function(idx, path) {
				if(path && path !== '/') {
                    build_path = paths.slice(0, idx+1).join('/') || '/';
					path = '/' + build_path + '/';
					// build_path += path;
					let active = '';
					if(path === folder) {
						active = ' active'
					}
					dropdown_menu.append(
						$('<li>').append(
							$('<a>').attr('href', '#').addClass('dropdown-item cvview' + active).data(
								'folder', build_path).append(
								$('<span>').addClass('cvc-folder').append(
									$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.folder)
								),
								' ', path
							)
						)
					)
				}
			});

			// enable the dropdown
			$path_btns.find('.dropdown-toggle').removeClass('disabled');
			$(self.frame).find('.cvview:not(.cvc-back)').removeClass('disabled');

			// set the paste button path
			$(self.frame).find('.cvc-paste').data('folder', folder);

			// if we have a copied file, enable the paste button
			if(self.copied_file) {
				$(self.frame).find('.cvc-paste').removeClass('disabled');
			}

			if(options.view && options.view !== listpane.data('view')) {
				refresh = true;
			}

			self.frame.find('.cvc-view-file').empty().hide();

			self.frame.find('.cvview').each(function(idx) {
				if($(this).data('view-type') === viewtype) {
					$(this).addClass('active');
				}
				else {
					$(this).removeClass('active');
				}
			});

			const process_file_list = function(files) {
				files.sort(function(a, b) {
					if(typeof a[options.sort] === 'number' && typeof b[options.sort] === 'number') {
						return options.dir === 'asc' ? a[options.sort] - b[options.sort] : b[options.sort] - a[options.sort];
					}

					if(a[options.sort] < b[options.sort]) {
						return options.dir === 'asc' ? -1 : 1;
					}
					else if(a[options.sort] > b[options.sort]) {
						return options.dir === 'asc' ? 1 : -1;
					}
					return 0;
				});

				if(options.search.length > 0) {
					let files_out = [];
					$.each(files, function(idx, f) {
						if(f.name.toLowerCase().indexOf(options.search.toLowerCase()) > -1) {
							files_out.push(f)
						}
					});
					files = files_out;
				}

				if(files.length < 1) {
					let empty_text = 'This folder is empty';
					if(options.search) {
						empty_text = 'No files match "' + options.search + '"'
					}
					listpane.append(
						$('<div>').css({
							minHeight: '100px',
							margin: '0 auto'
						}).addClass('text-center text-muted col-md-12').text(
							'This folder is empty'
						)
					)
				}
				else if(viewtype === 'icons') {
					self._draw_icons_frame(files);
				}
				else if(viewtype === 'list') {
					self._draw_table_frame(files);
				}
			};

			if(refresh) {
				listpane.empty();
				let fa_classes = [self._fa_base_class, 'fa-3x', 'fa-spin', self.options.fa_icons.loading]
				listpane.append(
					$('<div>').addClass('cvc-refresh-ind text-center text-muted').append(
						$('<i>').addClass(fa_classes.join(' ')),
						$('<br>'),
						'Loading icons, please wait ...'
					)
				);
				$.getJSON(self.options.list_files_url, {path: folder}, function(resp) {
					self.cached_files = resp.files;
					process_file_list(resp.files)

					// not using event because this is needed internally
					if(typeof options.refresh_callback === "function") {
						options.refresh_callback(resp.files)
					}
					listpane.append($('<div>').addClass('clearfix'));
				}).always(function() {
					listpane.find('.cvc-refresh-ind').remove();
				});
			}
			else {
				let file_list = self.cached_files;
				if(file_list.length < 1) {
					// backup but i'm not sure it's necessary
					listpane.find('.cvc-file').each(function(idx) {
						file_list.push($(this).data('icon_data'));
					});
				}
				process_file_list(file_list)
				listpane.append($('<div>').addClass('clearfix'));
			}

			this.$browse_tab.tab('show');
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
				return ('No files were selected for upload');
			}

			let fd = new FormData();
			let total_size = 0;
			$.each(files, function(idx, f) {
				fd.append( self.options.upload_field, f )
				total_size += f.size;
			});

			$('.cvcdropmessage').hide();
			$('.cvcprogress').show();

			// fix current_folder possibly not being defined if called externally
			if(!self.current_folder) {
				self.current_folder = '/'
			}

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
					console.log(err);
					txtstatus = txtstatus || 'Unknown';
					self.cvc_alert($(self.frame).find('.cvc-modal-body'), 'Error: ' + txtstatus)
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
					$('<div>').addClass(this.bs_header_class).append(
						$('<h4>').text(title)
					),
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
			const reset_input = function(name) {
				self.renaming = false;
				$fname_sel.empty().text(name || fname);
			};
			self.renaming = true;
			$fname_sel.empty().append(
				$('<input>').attr({name: 'new-name', type: 'text'}).val(fname).on('blur', function(e) {
					e.preventDefault();
					if($(this).val() === fname) {
						reset_input();
					}
					else {
						$.ajax(self.options.rename_file_url, {
							contentType: 'application/json;charset=UTF-8',
							data: JSON.stringify({file_data: $(obj).data('icon_data'), new_name: $(this).val()}),
							error: function (jqxhr, textstatus, err) {
								console.log(err);
								reset_input();
								self.cvc_alert($(self.frame).find('.cvc-modal-body'), textstatus);
							},
							method: 'POST',
							success: function (output) {
								if (output.status === 'OK') {
									reset_input(output.new_name);
									self.select(obj, output.link);
								} else {
									reset_input();
									self.cvc_alert($(self.frame).find('.cvc-modal-body'),
										output.message || 'Unable to rename file.');
								}
							}
						})
					}
				}).on('keyup', function(e) {
					e.preventDefault();
					if(e.which === 13) {  // Enter
						$(this).trigger('blur');
					}
					else if(e.which === 27) {  // escape
						reset_input();
					}
				})
			);
			$fname_sel.find('input').trigger('focus').trigger('select')
		},
		cvc_confirm: function(question, msg, options) {
			let self = this;
			let defaults = {
				yes: function() {
					$('.cvc-modal-modal').hide();
					return true;
				},
				no: function() {
					$('.cvc-modal-modal').hide();
					return false;
				}
			};
			options = $.extend(defaults, options || {});

			let $content = $('<div>').append(
				$('<div>').append(msg),
				$('<div>').addClass('cvc-confirm-actions text-center').append(
					$('<button>').attr('type', 'button').addClass('cvc-confirm-yes-btn btn btn-primary').append(
						$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.confirmYes),
						' Yes'
					),
					'&nbsp;',
					$('<button>').attr('type', 'button').addClass('cvc-confirm-no-btn btn btn-default').append(
						$('<i>').addClass(self._fa_base_class + ' ' + self.options.fa_icons.confirmNo),
						' No'
					)
				)
			);
			$content.find('.cvc-confirm-yes-btn').on('click', options.yes);
			$content.find('.cvc-confirm-no-btn').on('click', options.no);
			this._modal_modal(question, $content);
		},
		remove: function(obj, file) {
			let self = this;
			self.cvc_confirm('Are you sure you want to remove ' + $(obj).data('icon_data').name + '?',
				'Removing my cause links to break. Only proceed if you\'re sure!', {yes: function() {
				$.ajax(self.options.remove_file_url, {
					contentType: 'application/json;charset=UTF-8',
					data: JSON.stringify({file_data: $(obj).data('icon_data')}),
					error: function (jqxhr, textstatus, err) {
						self.cvc_alert($(self.frame), textstatus);
						console.log(err);
					},
					method: 'DELETE',
					success: function(output) {
						if(output.status === 'OK') {
							$(obj).remove();
							$('.cvc-modal-modal').hide();
							self.list(self.current_folder, true);
						}
					}
				})
			}})
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
			// select the file too
			self.select(obj, file);
		},
		view: function(obj, file) {
			let self = this;
			this.frame.find('.cvc-list-content-wrapper').hide();
			if($(obj).data('filedom')) {
				obj = $(obj).data('filedom');
			}

			self.frame.find('.cvc-view-file').append(
				$('<div>').append(
					self.mk_context_action('#', 'cvc-use', 'Use', self.options.fa_icons.useFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvc-copy', 'Copy', self.options.fa_icons.copyFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvc-move', 'Rename', self.options.fa_icons.moveFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvc-delete', 'Delete', self.options.fa_icons.deleteFile, obj, file, 'preview'),
					self.mk_context_action('#', 'cvview', 'Close Preview',
						self.options.fa_icons.closeView, obj, file, 'preview').data('folder', self.current_folder)
				),
				$('<div>').addClass('center-block text-center').append(
					this.create_icon($(obj).data('icon_data'), 'preview', {
						maxHeight: '70%',
						maxWidth: '70%',
						height: 'auto',
						faSize: 'fa-3x',
						iconClass: 'text-center',
						fontSize: '4rem'
					})
				)
			).show();
		},
		usefile: function(obj, file) {
			$('.cvc-selected').removeClass('cvc-selected');  // deslect the file
			this.frame.find('.cvc-view-file').empty().hide();
			this.list(this.current_folder || '/')
			// this.$elem.val(file);
			console.log(this.frame);
			this.frame.trigger('cvc.useFile', {file: file, filedom: obj, cvc: this});

			this.close_browser();
		},
        clear_select: function() {
		    let self = this;
			$('.cvc-selected').removeClass('cvc-selected');
			self.toolbar.find('.cvc-file-opt').each(function(idx) {
				if(($(this).hasClass('cvc-paste') && self.copied_file) || !$(this).hasClass('cvc-paste')) {
					$(this).data({}).addClass('disabled');
				}
			})
		},
		select: function(obj, file) {
			let self = this;
			let $obj = $(obj);
			if ($obj.hasClass('cvc-selected')) {
			    self.clear_select();
			} else {
				$('.cvc-selected').removeClass('cvc-selected');

				$obj.addClass('cvc-selected');
				self.toolbar.find('.cvc-file-opt').each(function(idx) {
					if(($(this).hasClass('cvc-paste') && self.copied_file) || !$(this).hasClass('cvc-paste')) {
						$(this).data({filedom: obj, link: file, icon_data: $obj.data('icon_data')}).removeClass('disabled')
					}
				})
				self.selected = $obj;
			}
		},
		_find_select: function(current, direction) {
			let currow = current.parent('.row');
			let position = currow.find('.cvc-file').index(current) + 1;

			let sel = null;
			let listpane = this.frame.find('.cvc-list-content').first();
			if(direction === 'up') {
				let newrow = null;
				if(currow.is(listpane.find('.row').first())) {
					newrow = listpane.find('.row').last();
				}
				else {
					newrow = currow.prev('.row');
				}

				sel = newrow.find('.cvc-file:nth-child(' + position + ')');
				if(sel.length < 1) {
					sel = newrow.find('.cvc-file').last();
				}
			}
			else if(direction === 'right') {
				if(currow.find('.cvc-file').last().is(current)) {
					if(currow.is(listpane.find('.row').last())) {
						sel = listpane.find('.row').find('.cvc-file').first();
					}
					else {
						sel = currow.next('.row').find('.cvc-file').first();
					}
				}
				else {
					sel = current.next('.cvc-file');
				}
			}
			else if(direction === 'down') {
				let newrow = null;
				if(currow.is(listpane.find('.row').last())) {
					newrow = listpane.find('.row').first();
				}
				else {
					newrow = currow.next('.row');
				}
				sel = newrow.find('.cvc-file:nth-child(' + position + ')');
				if(sel.length < 1) {
					sel = newrow.find('.cvc-file').last();
				}
			}
			else if(direction === 'left') {
				if(currow.find('.cvc-file').first().is(current)) {
					if(currow.is(listpane.find('.row').first())) {
						sel = listpane.find('.row').find('.cvc-file').last();
					}
					else {
						sel = currow.prev('.row').find('.cvc-file').last();
					}
				}
				else {
					sel = current.prev('.cvc-file');
				}
			}
			return sel;
		},
		close_browser: function(obj) {
			this.main_wrapper.modal('hide');
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
				self.frame = frame.document.$('body');
				this.list('/', true);
			}
			else {
				if(self.frame) {
					this.main_wrapper.modal('show');
					return;
				}

				frame = $('<div>').addClass('cvc-frame');
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
					let viewtype = $(this).data('view-type') || self.frame.find('.cvc-list-content').first().data('view') || 'icons';
					self.list(folder, true, {view: viewtype})
				});

				$(frame).on('click', '.cvc-create-folder', function(e) {
					e.preventDefault();
					self.create_folder_modal(self.current_folder || '/');
				});

				$(frame).on('click', '.cvc-copy', function(e) {
					e.preventDefault();
					self.copy($(this).data('filedom'));
				})

				$(frame).on('dragenter','.cvc-list-tab', function(e) {
					_clean_event(e);
					$('a[href="#cvcupload"]').trigger('click'); // ugly hack
					self.back_to_list = true;
				});

				$(frame).on('dragenter, dragover','.cvc-upload-tab',function(e) {
					$(this).removeClass('text-muted');
					_clean_event(e);
				});

				$(frame).on('dragleave','.cvc-upload-tab',function(e) {
					$(this).addClass('text-muted');
					if( self.back_to_list ) {
						self.frame.find('a[href="#cvclistview"]').trigger('click');
					}
				});

				$(frame).on('drop','.cvc-upload-tab',function(e) {
					e.preventDefault();
					$(this).addClass('text-muted');
					let files = e.originalEvent.dataTransfer.files;
					self.upload( files );
				});

				// for fallback reasons
				$(frame).on('change', '.cvc-fallback-input', function(e) {
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

				$(frame).on('click', '.cvc-delete', function(e) {
					e.preventDefault();
					self.remove($(this).data('filedom'), $(this).data('filedom').link);
				});

				$(frame).on('click', '.cvc-sort', function(e) {
					e.preventDefault();
					self.list(self.current_folder, false, {sort: $(this).data('sort'), dir: $(this).data('dir')});
				});
				$(frame).on('click', '.cvc-sort-toggle', function(e) {
					e.preventDefault();
					let sort = $(this).data('sort');
					let dir = 'asc';

					if(self.current_list_options.sort === sort) {
						if(self.current_list_options.dir === 'asc') {
							dir = 'desc';
						}
					}

					self.list(self.current_folder, false, {sort: sort, dir: dir});
				})

				// keyboard events
				$(document).on('keydown', function(e) {
					if(!self.renaming) {

						if (self.selected) {
							if (e.which === 67 && (e.metaKey || e.ctrlKey)) {
								self.copy(self.selected);
							} else if (e.which === 13) {
								if (self.selected.data('icon_data').type === 'dir') {
									self.selected.trigger('click');
								} else {
									self.view(self.selected, self.selected.data('link'));
								}

							} else {
								let pfile = null;
								if (e.which === 38 || e.which === 87) { // up or W
									pfile = self._find_select(self.selected, 'up');
								} else if (e.which === 39 || e.which === 68) {  // right arrow or D
									pfile = self._find_select(self.selected, 'right');
								} else if (e.which === 40 || e.which === 83) { // down arrow or S
									pfile = self._find_select(self.selected, 'down')
								} else if (e.which === 37 || e.which === 65) {  // left arrow or A
									pfile = self._find_select(self.selected, 'left')
								}

								if (pfile) {
									self.select(pfile, pfile.data('link'))
								}
							}
						} else if (self.copied_file && e.which === 86 && (e.metaKey || e.ctrlKey)) {
							self.paste(self.current_folder);
						}
					}
				});

				// custom events
				// finally set up events
				$.each(self.options.events, function(t, f) {
					$(frame).on(t, f);
				})

				$(window).on('resize', function(e) {
					// clear the context menu if it is visible
					$('.cvccontext').remove();
				});

				this.main_wrapper.modal('show');
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
