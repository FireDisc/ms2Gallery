ms2Gallery.panel.ResourceGallery = function(config) {
	config = config || {};
	var sourceId = Ext.get(config.targetTv).getValue();
	Ext.apply(config,{
		border: false
		,id: 'ms2gallery-resource-gallery'
		,baseCls: 'modx-formpanel'
		,items: [{
			border: false
			,cls: 'modx-page-header container'
			,html: _('ms2gallery_introtext')
		},{
			border: false
			,items: [{
				title: ''
				,border: false
				,items: [{
					xtype: 'ms2gallery-resource-plupload-panel'
					,id: 'ms2gallery-resource-plupload-panel'
					,record: config.record
					,targetTv:config.targetTv
					,gridHeight: 150
					,anchor: '100%'
				},{
					xtype: 'ms2gallery-resource-images-panel'
					,id: 'ms2gallery-resource-images-panel'
					,cls: 'modx-pb-view-ct main-wrapper'
					,resource_id: config.record.id
                    ,pageSize:config.pageSize
					,anchor: '100%'
				}]
			}]
		}]
	});
	ms2Gallery.panel.ResourceGallery.superclass.constructor.call(this,config);
};
Ext.extend(ms2Gallery.panel.ResourceGallery,MODx.Panel);
Ext.reg('ms2gallery-resource-gallery',ms2Gallery.panel.ResourceGallery);



// Adapted widgets from https://github.com/splittingred/Gallery

ms2Gallery.panel.ResourceImages = function(config) {
	config = config || {};

	this.view = MODx.load({
		id: 'ms2gallery-resource-images-view'
		,xtype: 'ms2gallery-resource-images-view'
		,onSelect: {fn:function() { }, scope: this}
		,containerScroll: true
		,ident: this.ident
		,cls: 'ms2gallery-resource-images'
		,pageSize: config.pageSize || MODx.config.default_per_page
		,resource_id: config.resource_id
		,inPanel: true
		,style: 'overflow: auto;'
	});

	this.view.pagingBar = new Ext.PagingToolbar({
		pageSize: config.pageSize || MODx.config.default_per_page
		,store: this.view.store
		,displayInfo: true
		,autoLoad: true
		,items: ['-'
			,_('per_page')+':'
			,{
				xtype: 'textfield'
				,value: config.pageSize || MODx.config.default_per_page
				,width: 40
				,listeners: {
					change: {fn:function(tf,nv,ov) {
						if (Ext.isEmpty(nv)) return false;
						nv = parseInt(nv);
						this.view.pagingBar.pageSize = nv;
						this.view.store.load({params:{start:0,limit: nv}});
					},scope:this}
					,render: {fn: function(cmp) {
						new Ext.KeyMap(cmp.getEl(), {
							key: Ext.EventObject.ENTER
							,fn: function() {this.fireEvent('change',this.getValue());this.blur();return true;}
							,scope: cmp
						});
					},scope:this}
				}
			}
			,'-'
		]
	});

	var dv = this.view;
	dv.on('render', function() {
		dv.dragZone = new MODx.DataView.dragZone(dv);
		dv.dropZone = new MODx.DataView.dropZone(dv);
	});

	Ext.applyIf(config,{
		id: 'ms2gallery-resource-images'
		,cls: 'browser-win'
		,layout: 'column'
		,minWidth: 500
		,minHeight: 350
		,autoHeight: true
		,modal: false
		,closeAction: 'hide'
		,border: false
		,autoScroll: true
		,items: [{
			id: 'ms2gallery-resource-gallery-list'
			,cls: 'browser-view'
			,region: 'center'
			,width: '65%'
			,minHeight: 450
			,autoScroll: true
			,border: false
			,tbar: [this.view.pagingBar]
			,items: [this.view]
			//,bbar: [this.view.pagingBar]

		},{
			html: ''
			,id: 'ms2gallery-resource-gallery-details'
			,region: 'east'
			,split: true
			,autoScroll: true
			,width: '30%'
			,minWidth: 150
			,maxWidth: 250
			//,height: 450
			,border: false
		}]
	});

	ms2Gallery.panel.ResourceImages.superclass.constructor.call(this,config);
};
Ext.extend(ms2Gallery.panel.ResourceImages,MODx.Panel,{
	windows: {}
/*
	,doRefresh: function() {
		this.view.getStore().reload();
	}
*/
});
Ext.reg('ms2gallery-resource-images-panel',ms2Gallery.panel.ResourceImages);


ms2Gallery.view.ResourceImages = function(config) {
	config = config || {};

	this._initTemplates();

	Ext.applyIf(config,{
		url: ms2Gallery.config.connector_url
		,fields: ['id','resource_id','name','description','url','createdon','createdby','file','thumbnail','filesort','source','type','rank','active','class']
		,id: 'ms2gallery-resource-images-view'
		,baseParams: {
			action: 'mgr/gallery/getlist'
			,resource_id: config.resource_id
			,parent: 0
			,type: 'image'
			,limit: config.pageSize || MODx.config.default_per_page
		}
		,loadingText: _('loading')
		,tpl: this.templates.thumb
		,enableDD: true
		,multiSelect: true
		,listeners: {}
		,prepareData: this.formatData.createDelegate(this)
	});
	ms2Gallery.view.ResourceImages.superclass.constructor.call(this,config);

	this.on('selectionchange',this.showDetails,this,{buffer: 100});
	this.addEvents('sort','select');
	this.on('sort',this.onSort,this);
	this.on('dblclick',this.onDblClick,this);
};
Ext.extend(ms2Gallery.view.ResourceImages,MODx.DataView,{
	templates: {}
	,windows: {}

	,onSort: function(o) {
		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/sort'
				,resource_id: this.config.resource_id
				,source: o.source.id
				,target: o.target.id
			}
		});
	}

	,onDblClick: function(d,idx,n) {
		var node = this.getSelectedNodes()[0];
		if (!node) return;

		if (this.config.inPanel) {
			this.cm.activeNode = node;
			this.updateImage(node,n);
		} else {
			var data = this.lookup[node.id];
			this.fireEvent('select',data);
		}
	}

	,updateImage: function(btn,e) {
		var node = this.cm.activeNode;
		var data = this.lookup[node.id];
		if (!data) return;

		this.windows.updateImage = MODx.load({
			xtype: 'ms2gallery-gallery-image-update'
			,record: data
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
		this.windows.updateImage.setValues(data);
		this.windows.updateImage.show(e.target);
	}

	,deleteImage: function(btn,e) {
		var node = this.cm.activeNode;
		var data = this.lookup[node.id];
		if (!data) return;

		MODx.msg.confirm({
			text: _('ms2gallery_file_delete_confirm')
			,url: this.config.url
			,params: {
				action: 'mgr/gallery/remove'
				,id: data.id
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,deleteMultiple: function(btn,e) {
		var recs = this.getSelectedRecords();
		if (!recs) return;

		var ids = '';
		for (var i=0;i<recs.length;i++) {
			ids += ','+recs[i].id;
		}

		MODx.msg.confirm({
			text: _('ms2gallery_file_delete_multiple_confirm')
			,url: this.config.url
			,params: {
				action: 'mgr/gallery/remove_multiple'
				,ids: ids.substr(1)
				,resource_id: this.config.resource_id
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,generateThumbs: function() {
		var node = this.cm.activeNode;
		var data = this.lookup[node.id];
		if (!data) return;

		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/generate'
				,id: data.id
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,generateThumbsMultiple: function() {
		var recs = this.getSelectedRecords();
		if (!recs) return;

		var ids = '';
		for (var i=0;i<recs.length;i++) {
			ids += ','+recs[i].id;
		}
		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/generate_multiple'
				,ids: ids.substr(1)
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,Activate: function() {
		var node = this.cm.activeNode;
		var data = this.lookup[node.id];
		if (!data) return;

		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/activate'
				,id: data.id
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,activateMultiple: function() {
		var recs = this.getSelectedRecords();
		if (!recs) return;

		var ids = '';
		for (var i=0;i<recs.length;i++) {
			ids += ','+recs[i].id;
		}
		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/activate_multiple'
				,ids: ids.substr(1)
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,inActivate: function() {
		var node = this.cm.activeNode;
		var data = this.lookup[node.id];
		if (!data) return;

		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/inactivate'
				,id: data.id
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,inactivateMultiple: function() {
		var recs = this.getSelectedRecords();
		if (!recs) return;

		var ids = '';
		for (var i=0;i<recs.length;i++) {
			ids += ','+recs[i].id;
		}
		MODx.Ajax.request({
			url: ms2Gallery.config.connector_url
			,params: {
				action: 'mgr/gallery/inactivate_multiple'
				,ids: ids.substr(1)
			}
			,listeners: {
				success: {fn:function() {this.store.reload()},scope: this}
			}
		});
	}

	,run: function(p) {
		p = p || {};
		var v = {};
		Ext.apply(v,this.store.baseParams);
		Ext.apply(v,p);
		this.pagingBar.changePage(1);
		this.store.baseParams = v;
		this.store.load();
	}

	,showDetails : function(){
		var selNode = this.getSelectedNodes();
		var detailEl = Ext.getCmp('ms2gallery-resource-gallery-details').body;
		if(selNode && selNode.length > 0){
			selNode = selNode[0];
			var data = this.lookup[selNode.id];
			if (data) {
				//detailEl.hide();
				this.templates.details.overwrite(detailEl, data);
				//detailEl.slideIn('l', {stopFx:true,duration:'0.1'});
				//detailEl.show();
			}
		}else{
			detailEl.update('');
		}
	}

	,formatData: function(data) {
		var formatSize = function(data){
			if(data.size < 1024) {
				return data.size + 'B';
			} else {
				return (Math.round(((data.size*10) / 1024))/10) + " KB";
			}
		};
		data.shortName = Ext.util.Format.ellipsis(data.name, 16);

		data.createdon = ms2Gallery.utils.formatDate(data.createdon); //new Date(data.createdon).format(MODx.config.manager_date_format + ' ' + MODx.config.manager_time_format);
		this.lookup['ms2-resource-image-'+data.id] = data;
		return data;
	}

	,_initTemplates: function() {
		this.templates.thumb = new Ext.XTemplate(
			'<tpl for=".">'
				,'<div class="modx-pb-thumb-wrap {class}" id="ms2-resource-image-{id}">'
					,'<div class="modx-gal-item-thumb">'
						,'<img src="{thumbnail}" title="{name}" />'
					,'</div>'
					,'<span>{shortName}</span>'
				,'</div>'
			,'</tpl>'
		);
		this.templates.thumb.compile();

		this.templates.details = new Ext.XTemplate(
			'<div class="details">'
				,'<tpl for=".">'
					,'<div class="modx-gallery-details-thumb">'
						,'<tpl if="type == \'image\'">'
							,'<a href="{url}" target="_blank"><img src="{url}" alt="{name}" /></a>'
						,'</tpl>'
						,'<tpl if="type != \'image\'">'
							,'<a href="{url}" target="_blank"><img src="{thumbnail}" alt="{name}" /></a>'
						,'</tpl>'
					,'</div>'
					,'<tpl if="active == 0">'
						,'<div class="modx-gallery-details-inactive">' + _('ms2gallery_file_inactive') +'</div>'
					,'</tpl>'
					,'<div class="modx-gallery-details-info">'
						,_('ms2gallery_id') + ': <strong>{id}</strong><br/><br/>'
						,_('ms2gallery_rank') + ': <strong>{rank}</strong><br/><br/>'
						,_('ms2gallery_filename') + ': <strong>{file}</strong><br/><br/>'
						,_('ms2gallery_name') + ': <strong>{name}</strong><br/><br/>'
						,_('ms2gallery_createdon') + ': <strong>{createdon}</strong><br/><br/>'
						,_('ms2gallery_source') + ': <strong>{source}</strong><br/><br/>'
						,_('ms2gallery_url') + ': <a href="{url}" target="_blank" class="link">{url}</a>'
						,'<tpl if="description"><p class="description">{description}</p></tpl>'
					,'</div>'
				,'</tpl>'
			,'</div>'
		);
		this.templates.details.compile();
	}

	,_showContextMenu: function(v,i,n,e) {
		e.preventDefault();
		var data = this.lookup[n.id];
		var m = this.cm;
		m.removeAll();
		var ct = this.getSelectionCount();
		if (ct == 1) {
			m.add({
				text: _('ms2gallery_file_update')
				,handler: this.updateImage
				,scope: this
			});
			if (data.type == 'image') {
				m.add({
					text: _('ms2gallery_image_generate_thumbs')
					,handler: this.generateThumbs
					,scope: this
				});
			}
			if (data.active == 1) {
				m.add({
					text: _('ms2gallery_file_inactivate')
					,handler: this.inActivate
					,scope: this
				});
			}
			else {
				m.add({
					text: _('ms2gallery_file_activate')
					,handler: this.Activate
					,scope: this
				});
			}
			m.add('-');
			m.add({
				text: _('ms2gallery_file_delete')
				,handler: this.deleteImage
				,scope: this
			});
			m.show(n,'tl-c?');
		} else if (ct > 1) {
			if (data.type == 'image') {
				m.add({
					text: _('ms2gallery_image_generate_thumbs')
					,handler: this.generateThumbsMultiple
					,scope: this
				});
			}
			m.add({
				text: _('ms2gallery_file_activate_multiple')
				,handler: this.activateMultiple
				,scope: this
			});
			m.add({
				text: _('ms2gallery_file_inactivate_multiple')
				,handler: this.inactivateMultiple
				,scope: this
			});
			m.add('-');
			m.add({
				text: _('ms2gallery_file_delete_multiple')
				,handler: this.deleteMultiple
				,scope: this
			});
			m.show(n,'tl-c?');
		}

		m.activeNode = n;
	}

});
Ext.reg('ms2gallery-resource-images-view',ms2Gallery.view.ResourceImages);



ms2Gallery.window.UpdateImage = function(config) {
	config = config || {};
	this.ident = config.ident || 'gupdit'+Ext.id();
	Ext.applyIf(config,{
		title: config.record.shortName || _('ms2gallery_file_update')
		,id: this.ident
		,closeAction: 'close'
		,width: 450
		,height: 350
		,url: ms2Gallery.config.connector_url
		,action: 'mgr/gallery/update'
		,layout: 'anchor'
		,autoHeight: false
		,fields: [
			{xtype: 'hidden',name: 'id',id: this.ident+'-id'}
			,{xtype: 'textfield',fieldLabel: _('ms2gallery_file_name'),name: 'file',id: this.ident+'-file',anchor: '100%'}
			,{
				layout:'column'
				,border: false
				,anchor: '100%'
				,items: [{
					columnWidth: .8
					,layout: 'form'
					,defaults: { msgTarget: 'under' }
					,border:false
					,items: [
						{xtype: 'textfield',fieldLabel: _('ms2gallery_file_title'),name: 'name',id: this.ident+'-name',anchor: '100%'}
					]
				},{
					columnWidth: .2
					,layout: 'form'
					,defaults: { msgTarget: 'under' }
					,border:false
					,items: [
						{xtype: 'xcheckbox',fieldLabel: _('ms2gallery_file_active'),name: 'active',id: this.ident+'-active'}
					]
				}]
			}
			,{xtype: 'textarea',fieldLabel: _('ms2gallery_file_description'),name: 'description',id: this.ident+'-description',anchor: '100% -150'}
		]
		,keys: [{key: Ext.EventObject.ENTER,shift: true,fn: this.submit,scope: this}]
	});
	ms2Gallery.window.UpdateImage.superclass.constructor.call(this,config);
	/*
	this.on('activate',function(w,e) {
		if (typeof Tiny != 'undefined') { MODx.loadRTE(this.ident + '-description'); }
		var d = this.fp.getForm().getValues();
		if (d && d.image) {
			var p = Ext.getCmp(this.ident+'-preview');
			var u = d.image+'&h=200&w=200&zc=1&q=100&f=png';
			p.update('<div class="gal-item-update-preview"><img src="'+u+'" alt="" onclick="Ext.getCmp(\'gal-album-items-view\').showScreenshot(\''+d.id+'\'); return false;" /></div>');
		}
	},this);
	*/
};
Ext.extend(ms2Gallery.window.UpdateImage,MODx.Window);
Ext.reg('ms2gallery-gallery-image-update',ms2Gallery.window.UpdateImage);



ms2Gallery.panel.Plupload = function(config) {
	config = config || {};

	Ext.applyIf(config,{
		id: 'ms2gallery-uploader-panel'
		,width: '100%'
		,height: (config.gridHeight || 200) + 50
		,autoScroll: true
		,border:false
		,frame:false
		,cls: ''
		,layout:'absolute'
		,uploadListData: {}
		,tbar: {
			width: '90%'
			,items:[
				{xtype: 'button',id: 'ms2gallery-upload-button-'+config.record.id,text: _('ms2gallery_button_upload')}
				,{xtype: 'tbspacer',width: 30}
				,{xtype: 'displayfield',html: '<b>' + _('ms2gallery_source') + '</b>:&nbsp;&nbsp;'}
				,{xtype: 'ms2gallery-combo-source',id: 'ms2gallery-resource-source',description: '<b>[[+source]]</b><br />'+_('ms2gallery_source_help')
					,value: config.record.source
					,listeners: {
						select: {fn: this.sourceWarning,scope: this}
					}
				}
				,{xtype: 'tbspacer',width: 30}
				,{xtype: 'button',text: _('ms2gallery_uploads_clear'),handler: function() {
					this.fileGrid.getStore().removeAll();
					this.resetUploader();
				},scope: this}
			]
		}
		,items:[{
			xtype:'panel'
			,width: '90%'
		},{
			xtype:'grid'
			,id: 'plupload-files-grid-'+config.record.id
			,width: '90%'
			,height:config.gridHeight || 200
			,enableHdMenu:false
			,store:new Ext.data.ArrayStore({
				fields: ['id', 'name', 'size', 'status', 'progress']
				,reader: new Ext.data.ArrayReader({idIndex: 0}, this.fileRecord)
			})
			,autoExpandColumn: 'plupload-column-filename'
			,viewConfig: {
				forceFit: true
				,enableRowBody: true
				,autoFill: true
				,showPreview: true
				,scrollOffset: 0
				,emptyText: _('ms2gallery_emptymsg')
			}
			,columns:[
				{header: _('ms2gallery_filename'), dataIndex:'name', width:250, id: 'plupload-column-filename'}
				,{header: _('ms2gallery_size'), dataIndex:'size', width:100, renderer:Ext.util.Format.fileSize}
				,{header: _('ms2gallery_status'), dataIndex:'status', width: 100, renderer:this.statusRenderer}
				,{header: _('ms2gallery_progress'), dataIndex:'percent', width: 200, scope:this, renderer:this.progressBarColumnRenderer}
			]
			,listeners:{
				render:{fn: function() {
					this._initUploader();
				},scope:this}
				,viewready:{fn: function() {
					this.fileGrid.getStore().removeAll();
				}, scope:this}
			}
		}]
	});
	ms2Gallery.panel.Plupload.superclass.constructor.call(this,config);

};
Ext.extend(ms2Gallery.panel.Plupload,MODx.Panel, {

	sourceWarning: function(combo,option) {
		console.log(this.config);
		var source = Ext.get(this.config.targetTv); //var source = Ext.getCmp('modx-resource-source-hidden');
		var select = Ext.getCmp('ms2gallery-resource-source');
		var source_id = source.getValue();
		var sel_id = select.getValue();

		if(source_id != sel_id) {
			Ext.Msg.confirm(_('warning'), _('ms2gallery_change_source_confirm'), function(e) {
				if (e == 'yes') {
					source.set({value: sel_id});//.setValue(sel_id);
					var f = Ext.getCmp('modx-page-update-resource');
					MODx.activePage.submitForm({
						success: {fn:function(r) {
							var page = MODx.action ? MODx.action['resource/update'] : 'resource/update';
							MODx.loadPage(page, 'id='+r.result.object.id);
						},scope:this}
					});
				} else {
					select.setValue(source_id);
				}
			},this);
		}
	}

	,progressBarColumnTemplate: new Ext.XTemplate(
		'<div class="ux-progress-cell-inner ux-progress-cell-inner-center ux-progress-cell-foreground">',
		'<div>{value} %</div>',
		'</div>',
		'<div class="ux-progress-cell-inner ux-progress-cell-inner-center ux-progress-cell-background" style="left:{value}%">',
		'<div style="left:-{value}%">{value} %</div>',
		'</div>'
	)

	,progressBarColumnRenderer:function(value, meta, record, rowIndex, colIndex, store){
		meta.css += ' x-grid3-td-progress-cell';
		return this.progressBarColumnTemplate.apply({
			value: value
		});
	}

	,statusRenderer:function(value, meta, record, rowIndex, colIndex, store){
		return _('ms2gallery_status_code_' + value);
	}

	,updateFile:function(file){
		var store = this.fileGrid.getStore();
		var storeId = store.find('id',file.id);
		var fileRec = store.getAt(storeId);

		fileRec.set('percent', file.percent);
		fileRec.set('status', file.status);
		fileRec.set('size', file.size);
		fileRec.commit();
	}

	,uploader: null

	,_initUploader: function(){
		var fields = ['id', 'name', 'size', 'status', 'progress'];
		this.fileRecord = Ext.data.Record.create(fields);
		this.fileGrid = Ext.getCmp('plupload-files-grid-'+this.record.id);

		var params = {
			action: 'mgr/gallery/upload'
			,id: this.record.id
			,source: this.record.source
			,ctx: 'mgr'
			,HTTP_MODAUTH:MODx.siteId
		};

		this.uploader = new plupload.Uploader({
			url: ms2Gallery.config.connector_url + '?' + Ext.urlEncode(params)
			,runtimes: 'html5,flash,html4'
			,browse_button: 'ms2gallery-upload-button-' + this.record.id
			,container: this.id
			,drop_element: 'plupload-files-grid-' + this.record.id
			,multipart: false
			,max_file_size : ms2Gallery.config.maxUploadSize || 10485760
			,flash_swf_url : ms2Gallery.config.assets_url + 'js/mgr/misc//plupload/plupload.flash.swf'
			,filters : [{
				title : "Image files"
				,extensions : ms2Gallery.config.media_source.allowedFileTypes || 'jpg,jpeg,png,gif'
			}]
			,resize : {
				width : ms2Gallery.config.media_source.maxUploadWidth || 1920
				,height : ms2Gallery.config.media_source.maxUploadHeight || 1080
				//,quality : 100
			}
		});

		var uploaderEvents = ['FilesAdded', 'FileUploaded', 'QueueChanged', 'UploadFile', 'UploadProgress', 'UploadComplete' ];
		Ext.each(uploaderEvents, function (v) {
			var fn = 'on' + v;
			this.uploader.bind(v, this[fn], this);
		},this);

		this.uploader.init();
	}

	,onFilesAdded: function(up, files) {
		this.uploadListData.files = up.files;
		this.updateList = true;
	}

	,removeFile: function(id) {
		this.updateList = true;
		var f = this.uploader.getFile(id);
		this.uploader.removeFile(f);
	}

	,onQueueChanged: function(up) {
		if(this.updateList){
			if(this.uploadListData.files.length > 0){
				var ms2g = this;
				Ext.each(this.uploadListData.files, function(file, i){
					var fileRec = new ms2g.fileRecord(file);
					ms2g.fileGrid.store.add(fileRec);
				});
				ms2g.uploader.start();
			} else {
				var store = this.fileGrid.getStore();
				store.removeAll();
			}
			up.refresh();
		}
	}

	,onUploadFile: function(uploader, file){
		this.updateFile(file);
	}

	,onUploadProgress: function(uploader, file){
		this.updateFile(file);
	}

	,onUploadComplete: function(uploader, files){
		if (this.errors.length > 0) {
			this.fireAlert();
		}
		Ext.getCmp('ms2gallery-resource-images-panel').view.getStore().reload();
		this.resetUploader();
	}

	,onFileUploaded: function(uploader, file, xhr){
		var r = Ext.util.JSON.decode( xhr.response );
		if(!r.success){
			this.addError(file.name, r.message);
		}
		this.updateFile(file);
	}

	,resetUploader: function() {
		this.uploader.destroy();
		this.uploadListData.files = {};
		this.errors = '';
		this._initUploader();
	}

	,errors: ''

	,addError: function(file, message) {
		this.errors += file + ': ' + message + '<br/>';
	}

	,fireAlert: function() {
		Ext.MessageBox.show({
			title: _('ms2gallery_errors')
			,msg: this.errors
			,buttons: Ext.Msg.OK
			,modal: false
			,minWidth: 400
		});
	}

});
Ext.reg('ms2gallery-resource-plupload-panel',ms2Gallery.panel.Plupload);