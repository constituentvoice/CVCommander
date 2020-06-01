import $ from 'jquery';
import {cvCommanderConfig, cvcDefaults, cvcFaVarients} from './config';

export class cvCommander {
    private _defaults: cvCommanderConfig = cvcDefaults;
    private _name: string;
    private options: cvCommanderConfig;
    private faBaseClass: string;
    private $elem: JQuery;
    private $frameHTML: JQuery;

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

    private cleanEvent(e: Event) {
        e.stopPropagation();
        e.preventDefault();
    }

    openBrowser() {

    }

}