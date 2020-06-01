export interface cvcFaIcons {
    openCommander?: string,
    iconView?: string,
    listView?: string,
    closeCommander?: string,
    useFile?: string,
    viewFile?: string,
    copyFile?: string,
    moveFile?: string,
    deleteFile?: string
}

// defines font-awesome icons to use for various mime-types.
export const cvcMimeIcons:any = {
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
    'image/([^p]{1,2}png|gif|jpeg|tiff?|bmp|svg\+xml|webp|x\-icon)': ['self', 'file-image'],
    '^image\/': 'file-image',
    '^video\/': 'file-video',
    '^audio\/': 'file-audio',
    'dir': 'folder'
}

export interface cvCommanderConfig {
    width?: number,
    height?: number,
    uploadUrl?: string,
    uploadField?: string,
    allowInlineDrop?: boolean,
    listFilesUrl?: string,
    path?: string,
    modal?: boolean,
    modalCss?: object,
    buttonClass?: string,
    buttonText?: string,
    faVersion?: number,
    faVariant?: string,
    faIcons?: cvcFaIcons,
    error?: Function,
    fileErrorTimeout?: number,
    icons?: object,
}

export const cvcIconDefaults: cvcFaIcons = {
    openCommander: 'fa-camera',
    iconView: 'fa-th-large',
    listView: 'fa-th-list',
    closeCommander: 'fa-close',
    useFile: 'fa-check-circle',
    viewFile: 'fa-eye',
    copyFile: 'fa-copy',
    moveFile: 'fa-arrows-alt',
    deleteFile: 'fa-trash-alt'
}

export const cvcDefaults: cvCommanderConfig = {
    width: 600,
    height: 400,
    uploadUrl: '/cvc/upload',
    uploadField: '/cvc/list',
    allowInlineDrop: true,
    listFilesUrl: '/cvc/list',
    path: '/',
    modal: true,
    modalCss: null,
    buttonClass: 'btn btn-light',
    buttonText: '',
    faVersion: 5,
    faVariant: 'regular',
    faIcons: cvcIconDefaults,
    fileErrorTimeout: 10,
    error: function(msg:string) { console.log(msg); },
    icons: cvcMimeIcons
}

export const cvcFaVarients: any = {
    free: 'fas',
    regular: 'far',
    light: 'fal',
    duotone: 'fad'
}

