import $ from 'jquery';
import {cvCommanderConfig, cvcDefaults, cvcFaVarients, cvcFile, cvcListOptions, cvcListDefaults} from './config';
import moment from 'moment'
import SuccessCallback = JQuery.Ajax.SuccessCallback;

export class cvCommander {
    private _defaults: cvCommanderConfig = cvcDefaults;
    private _name: string;
    private options: cvCommanderConfig;
    readonly faBaseClass: string;
    private $elem: JQuery;
    private $frameHTML: JQuery;
    private $dropContainer : JQuery;

    constructor(element: JQuery, config: cvCommanderConfig) {
        this._name = 'cvCommander';
        this.options = $.extend({}, this._defaults, config);
        if(this.options.fileErrorTimeout > -1) {
            this.options.fileErrorTimeout *= 1000;
        }

        this.$elem = $(element);
        this.$elem.wrap($('<div>').addClass('cvcinput input-group'));
        this.$elem.parent().wrap($('<div>').addClass('cvcontainer'));

        if(this.options.faVersion > 4) {
            this.faBaseClass = cvcFaVarients[this.options.faVariant];
        }
        else {
            this.faBaseClass = 'fa';
        }

        this.$frameHTML = this.createFrame();
        let $button = this.createButton();

    }

    private createFrame() : JQuery {
        let $frame: JQuery, $modal: JQuery, $header: JQuery, $body: JQuery;
        $frame = $('<div>').attr('id', 'cvc-container')
        if(this.options.modal) {
            $frame.addClass('modal fade');
            $modal = $('<div>').addClass('modal-content');
            $header = $('<div>').addClass('modal-header');
            $body = $('<div>').addClass('modal-body');
        }
        else {
            $modal = $('<div>').addClass('panel panel-default');
            $header = $('<div>').addClass('panel-header');
            $body = $('<div>').addClass('panel-body');
        }

        $header.append(
            $('<ul>').addClass('nav nav-tabs').attr('role', 'tablist').prop('id', 'cvcmaintabs').append(
                $('<li>').addClass('nav-item').append(
                    $('<a>').attr({id: 'browsetab', href: '#cvclistview', role: 'tab', 'data-toggle': 'tab'})
                        .addClass('nav-link active')
                        .append($('<i>').addClass(this.faBaseClass + ' fa-folder-open-o'), ' Browse')
                ),
                $('<li>').attr('role', 'presentation').append(
                    $('<a>').addClass('nav-link').attr({href: '#cvcupload', role: 'tab', 'data-toggle': 'tab'})
                        .append($('<i>').addClass(this.faBaseClass + ' fa-cloud-upload'), ' Upload')
                )
            ),
            $('<button>').addClass('close').attr({type:'button', 'aria-label': 'Close', 'data-dismiss': 'modal'})
                .append($('<i>').addClass(this.faBaseClass + ' fa-sm fa-close'))
        );

        $body.append(
            $('<div>').addClass('tab-content').append(
                $('<div>').addClass('tab-pane active').attr('id', 'cvclistview').append(
                    $('<div>').attr('id', 'cvclist-toolbar').append(
                        $('<div>').addClass('btn-group').append(
                            $('<a>').attr('href', '#').attr({name: 'Icon View', 'alt': 'Icon View'})
                                .data('view-type', 'icons').addClass('cvview btn btn-sm btn-light').append(
                                $('<i>').addClass(this.faBaseClass + ' fa-th-large')
                            ),
                            $('<a>').attr('href', '#').attr({name: 'List View', alt: 'List View'})
                                .data('view-type', 'list').addClass('cvview btn btn-sm btn-light').append(
                                $('<i>').addClass(this.faBaseClass + ' fa-th-list')
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

        $modal.append($header, $body);
        if(this.options.modal) {
            let $dialog : JQuery = $('<div>').attr('role', 'document').addClass('modal-dialog modal-lg').append($modal);
            $frame.append($dialog.append($modal));
        }
        else {
            $frame.append($modal);
        }
        return $frame;
    }

    private createButton() : JQuery {
        /* create button */
        let button : JQuery = $('<button />');
        button.attr('type', "button");
        button.addClass(this.options.buttonClass);

        let _markup : string = '';
        if( this.options.faIcons.openCommander ) {
            _markup += '<i class="' + this.faBaseClass + ' ' + this.options.faIcons.openCommander + '"></i>';
            if( this.options.buttonText ) {
                _markup += " ";
            }
        }

        let self = this;
        _markup += this.options.buttonText;
        if( _markup ) {
            button.html(_markup)
        }

        button.on('click',  function(e: Event) {
            e.preventDefault();
            self.openBrowser();
        });
        button.wrap('<span class="input-group-btn">');
        this.$elem.after( button.parent() );
        return button;
    }

    private createInlineDrop() : void {
        this.$dropContainer = this.$elem.parent().parent();
        this.$dropContainer.append(
            $('<div>').addClass('cvcupload-inline center text-muted').css(
                'display', 'none').append(
                $('<span>').addClass('cvcdropmessage').append('Drop files to upload and select'),
                $('<div>').addClass('progress cvcdropmessage').
                    css( 'display', 'none').append(
                    $('<div>').addClass('progress-bar progress-bar-success').attr(
                                {role: 'progressbar', 'aria-valuenow': 60, 'aria-valuemin': 0,
                                    'aria-valuemax': 100}
                    ).css('width', '0%')
                )
            )
        )
    }

    private createIcon(file : cvcFile, view_type? : string ) : JQuery {
        let icon_out : JQuery = null;
        if(!view_type) {
            view_type = 'icons';
        }

        let self = this;

        $.each(self.options.icons, function(rule : string, icon_name : string | string[]) : false | void {
            let regex_rule = new RegExp(rule);
            if(file.type.match(regex_rule) || file.type === rule) {
                let icon_lg : string = '';
                let icon_sm : string = '';
                if(Array.isArray(icon_name)) {
                    icon_lg = icon_name[0];
                    icon_sm = icon_name[1];
                }
                else {
                    icon_lg = icon_sm = icon_name;
                }

                if(icon_lg === 'self' && view_type === 'icons') {
                    icon_out = $('<div>').addClass('cvc-file col-md-3 text-center').data('link', file.url).append(
                        $('<img>').attr({src: file.url, align: 'center'}).css({maxWidth: '4em', maxHeight: '4em'}),
                        $('<span>').addClass('cvc-f-name').append(file.name)
                    );
                }
                else {
                    icon_out = $('<tr>').addClass('cvc-file').data('link', file.url).append(
                        $('<td>').append($('<i>').addClass(`${self.faBaseClass} fa-${icon_sm}`),
                            '&nbsp;', file.name),
                        $('<td>').data('sort', file.modified).append(moment.unix(file.modified).format('ddd, MMM do, YYYY')),
                        $('<td>').data('sort', file.size).append(self.humanSize(file.size, 0))
                    )
                }
                return false; // to break out of each if we found something
            }
        });

        if(!icon_out) {
            if(view_type === 'icons') {
                icon_out = $('<div>').addClass('col-md-3 text-center').append(
                    $('<i>').addClass(`${this.faBaseClass} fa-3x fa-file-o`),
                    $('<br>'),
                    file.name
                )
            }
            else {
                icon_out = $('<tr>').append(
                    $('<td>').append(
                        $('<i>').addClass(`${this.faBaseClass} fa-file-o`),
                        '&nbsp;', file.name
                    ),
                    $('<td>').data('sort', file.modified).append(moment.unix(file.modified).format('ddd, MMM do, YYYY')),
                    $('<td>').data('sort', file.size).append(self.humanSize(file.size, 0))
                )
            }
        }
        return icon_out;
    }

    private swapInline(e : Event, container : JQuery, showHide : string) : void {
        this.cleanEvent(e);
        let cvcInput : JQuery = $(container).find('.cvcinput');
        let cvcInline : JQuery = $(container).find('.cvcupload-inline');

        if(showHide === 'show') {
            cvcInline.show();
            cvcInput.hide();
        }
        else {
            cvcInput.show();
            cvcInline.hide();
        }
    }

    private cleanEvent(e: Event) : void {
        e.stopPropagation();
        e.preventDefault();
    }

    private humanSize(bytes : number, iter : number) : string {
        let labels : string[] = ['B', 'K', 'M', 'G']
        if(!iter) {
            iter = 0;
        }
        if(iter >= labels.length) {
            iter = labels.length - 1;
        }
        if(bytes < 1024 || iter >= labels.length) {
            return `${bytes} ${labels[iter]}`;
        }
        else {
            bytes = Math.round(bytes / 1024);
            return this.humanSize(bytes, iter++);
        }
    }

    public listFiles(folder : string, refresh : boolean, options? : cvcListOptions) : void {
        let self = this;
        options = options || {};

        let listpane = this.$frameHTML.find('#cvclistcontent');
        let viewtype = options.view || listpane.data('view') || 'icons';

        if(options.view && options.view !== listpane.data('view')) {
            refresh = true;
        }

        if(refresh) {
            listpane.html('');
            if(viewtype === 'icons') {
                listpane.append($('<div>').addClass('row'));
            }
            else {
                listpane.append($('<table>').attr(
                    'width', '100%').addClass('table table-striped')).append(
                    $('<thead>').append($('<tr>').append(
                        $('<th>').append('Name'),
                        $('<th>').append('Modified'),
                        $('<th>').append('Size')
                    )),
                    $('<tbody>')
                )
            }
        }
        if(viewtype === 'icons') {
            listpane.data('view-type', 'icons');
            listpane = listpane.find('.row:last-child');
        }
        else {
            listpane.data('view-type', 'list');
            listpane.wrap($('<div>').addClass('table-responsive'))
            listpane = listpane.find('tbody');
        }

        $('.cvview').each(function(idx : number) {
            if($(this).data('view-type') === viewtype) {
                $(this).addClass('active');
            }
            else {
                $(this).removeClass('active');
            }
        });

        $.getJSON(self.options.listFilesUrl, function(resp) {
           let icoCount = 0;
           $.each(resp.files, function(idx : number, obj : cvcFile) {
               listpane.append(self.createIcon(obj, viewtype));
               icoCount ++;
               if(icoCount === 4 && viewtype === 'icons') {
                   icoCount = 0;
                   let newpane : JQuery = $('<div>').addClass('row');
                   listpane.parent().append(newpane);
                   listpane = newpane;
               }
           });
        });
        if(refresh) {
            listpane.parent().append($('<div>').addClass('clearfix'));
        }
    }

    private setProgress(percent : number) : void {
        $('.cvcprogress').find('.progress-bar').attr('aria-valuenow', percent).css(
            'width', `${percent}%`
        );
    }

    public upload(files : File[], callbackSuccess? : SuccessCallback<void>) {
        let self = this;

        if(!callbackSuccess) {
            callbackSuccess = function(data : any) : void {
                $('.cvcdropmessage').show();
                $('.cvcprogress').hide();
                self.listFiles('/', true);
                $('a[href="#cvclistview"]').trigger('click');
            }
        }

        if(files.length < 1) {
            return self.options.error('No files were selected for upload');
        }

        let fd = new FormData();
        let totalSize = 0;

        $.each(files, function(idx: number, f : File) {
            fd.append(self.options.uploadField, f);
            totalSize += f.size;
        });
        $('.cvcdropmessage').hide();
        $('.cvcprogress').show();

        $.ajax(self.options.uploadUrl, {
            xhr: function() {
                let xhrobj = new window.XMLHttpRequest();
                if( xhrobj.upload) {
                    xhrobj.upload.addEventListener('progress', function(e) {
                        let pos = e.loaded;
                        let percent = 0;
                        try {
                            percent = Math.ceil(pos / totalSize * 100);
                        }
                        catch(exc) {}
                        self.setProgress(percent);
                    }, false);
                }
                return xhrobj;
            },
            type: 'POST',
            contentType: false,
            processData: false,
            data: fd,
            success: callbackSuccess,
            error: function(xhr, txtStatus, err) {
                console.log(err);
                self.options.error(txtStatus);
            }
        })
    }

    private MakeContextAction(_link : string, _class : string, _text : string, _icon : string, obj : JQuery, file : string) : JQuery {
        return $('<a>').attr('href', _link).addClass(
            `list-group-item list-group-action ${_class}`).append(
                $('<i>').addClass(`${this.faBaseClass} ${_icon}`),' ', _text
            ).data({filedom: obj, link: file});
    }

    private contextMenu(obj : JQuery, file : string, x : number, y : number) : void {
        let self = this;
        let ctxMenu = $('<div>').addClass('cvccontext').css({
            position: 'absolute',
            top: y,
            left: x,
            backgroundColor: 'white',
            zIndex: '99999',
            width: '11rem'
        }).append(
            $('<div>').addClass('list-group')
        )
    }

    public openBrowser() : void {

    }

}