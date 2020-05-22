import $ from 'jquery';
import {cvCommanderConfig, cvcDefaults} from './config';

export class cvCommander {
    private element: object;
    private _defaults: cvCommanderConfig = cvcDefaults;
    private _name: string;
    private options: cvCommanderConfig;
    private faBaseClass: string;
    private faVariants: object = {free: 'fas', regular: 'far', light: 'fal', duotone: 'fad'};

    constructor(element: object, config: cvCommanderConfig) {
        this.options = $.extend({}, this._defaults, config);
        
    }

}