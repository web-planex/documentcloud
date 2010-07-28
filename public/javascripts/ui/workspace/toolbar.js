dc.ui.Toolbar = dc.View.extend({

  id : 'toolbar',

  callbacks : {
    '#open_viewers.click'            : '_openViewers',
    '#open_timeline.click'           : '_openTimeline',
    '#open_related_documents.click'  : '_openRelatedDocuments',
    '#toolbar_upload.click'          : '_openUpload'
  },

  constructor : function(options) {
    this._floating = false;
    this.base(options);
    _.bindAll(this, '_updateSelectedDocuments', '_addProjectWithDocuments',
      '_deleteSelectedDocuments', 'editTitle', 'editSource', 'editDescription',
      'editRelatedArticle', 'editAccess', 'displayEmbedSnippet', 'checkFloat');
    this.editMenu         = this._createEditMenu();
    this.publishMenu      = this._createPublishMenu();
    this.projectMenu      = new dc.ui.ProjectMenu({onClick : this._updateSelectedDocuments, onAdd : this._addProjectWithDocuments});
  },

  render : function() {
    var el = $(this.el);
    el.html(JST['workspace/toolbar']({}));
    $('.project_menu_container', el).append(this.projectMenu.render().el);
    $('.edit_menu_container', el).append(this.editMenu.render().el);
    $('.publish_menu_container', el).append(this.publishMenu.render().el);
    this.openButton              = $('#open_viewers', this.el);
    this.timelineButton          = $('#open_timeline', this.el);
    this.floatEl                 = $('#floating_toolbar', this.el);
    this.relatedDocumentsButton  = $('#open_related_documents', this.el);
    $(window).scroll(this.checkFloat);
    this.setCallbacks();
    return this;
  },

  notifyProjectChange : function(projectName, numDocs, removal) {
    var prefix = removal ? 'Removed ' : 'Added ';
    var prep   = removal ? ' from "'  : ' to "';
    var notification = prefix + numDocs + ' ' + Inflector.pluralize('document', numDocs) + prep + projectName + '"';
    dc.ui.notifier.show({mode : 'info', text : notification});
  },

  // Wrapper function for safely editing an attribute of a specific document.
  edit : function(callback, message) {
    if (!Documents.allowedToEditSelected(message)) return;
    return callback.call(this, Documents.selected());
  },

  editTitle : function() {
    this.edit(function(docs) {
      var doc = docs[0];
      dc.ui.Dialog.prompt('Title', doc.get('title'), function(title) {
        Documents.update(doc, {title : title});
        return true;
      }, {mode : 'short_prompt'});
    });
  },

  editDescription : function() {
    this.edit(function(docs) {
      var doc = docs[0];
      dc.ui.Dialog.prompt('Description', doc.get('description'), function(description) {
        Documents.update(doc, {description : description});
        return true;
      });
    });
  },

  editSource : function() {
    this.edit(function(docs) {
      var current = Documents.sharedAttribute(docs, 'source') || '';
      dc.ui.Dialog.prompt('Source', current, function(source) {
        _.each(docs, function(doc) { Documents.update(doc, {source : source}); });
        return true;
      }, {mode : 'short_prompt', information : this._subtitle(docs.length)});
    });
  },

  editRelatedArticle : function() {
    this.edit(function(docs) {
      var current = Documents.sharedAttribute(docs, 'related_article') || '';
      dc.ui.Dialog.prompt('Related Article', current, function(rel) {
        _.each(docs, function(doc) { Documents.update(doc, {related_article : rel}); });
        return true;
      }, {mode : 'short_prompt', information : this._subtitle(docs.length)});
    });
  },

  editAccess : function() {
    if (!Documents.allowedToEditSelected()) return;
    var docs    = Documents.selected();
    var current = Documents.sharedAttribute(docs, 'access') || dc.access.PRIVATE;
    dc.ui.Dialog.choose('Access Level', [
      {text : 'Public Access',              description : 'Anyone on the internet can search for and view the document.',              value : dc.access.PUBLIC,       selected : current == dc.access.PUBLIC},
      {text : 'Private Access',             description : 'Only people explicitly granted permission (via collaboration) may access.', value : dc.access.PRIVATE,      selected : current == dc.access.PRIVATE},
      {text : 'Private to my Organization', description : 'Only the people in your organization may view the document.',               value : dc.access.ORGANIZATION, selected : current == dc.access.ORGANIZATION}
    ], _.bind(function(access) {
      _.each(docs, function(doc) { Documents.update(doc, {access : parseInt(access, 10)}); });
      var notification = 'Access updated for ' + docs.length + ' ' + Inflector.pluralize('document', docs.length);
      dc.ui.notifier.show({mode : 'info', text : notification});
      return true;
    }, this), {information : this._subtitle(docs.length)});
  },

  displayEmbedSnippet : function() {
    if (dc.app.organization.demo) return dc.ui.Dialog.alert('Demo accounts are not allowed to embed document viewers.');
    this.edit(function(docs) {
      new dc.ui.EmbedDialog(docs[0]);
    }, 'At this stage in the DocumentCloud beta, you can\'t yet embed documents that you haven\'t uploaded yourself.');
  },

  checkFloat : function() {
    var floating = $(window).scrollTop() > $(this.el).offset().top - 30;
    if (this._floating == floating) return;
    $(document.body).toggleClass('floating_toolbar', this._floating = floating);
    if (!floating) $(document.body).trigger('click');
  },

  _subtitle : function(count) {
    return count > 1 ? count + ' Documents' : '';
  },

  _updateSelectedDocuments : function(project) {
    var docs = Documents.selected();
    var removal = project.containsAny(docs);
    removal ? project.removeDocuments(docs) : project.addDocuments(docs);
    this.notifyProjectChange(project.get('title'), docs.length, removal);
  },

  _addProjectWithDocuments : function(title) {
    var ids = Documents.selectedIds();
    var project = new dc.model.Project({title : title, annotation_count : 0, document_ids : ids.join(',')});
    Projects.create(project, null, {error : function() { Projects.remove(project); }});
    this.notifyProjectChange(title, ids.length);
  },

  _deleteSelectedDocuments : function() {
    Documents.destroySelected();
  },

  _openTimeline : function() {
    var docs = Documents.selected();
    if (!docs.length) return dc.ui.Dialog.alert("In order to view a timeline, please select some documents.");
    new dc.ui.TimelineDialog(docs);
  },

  _openRelatedDocuments : function() {
    var docs = Documents.selected();
    if (docs.length != 1) return dc.ui.Dialog.alert("Please select a single document, in order to view related documents.");
    dc.app.searchBox.search('related: ' + docs[0].id + '-' + docs[0].attributes().slug);
  },

  _openUpload : function() {
    dc.app.uploader.open();
  },

  _panel : function() {
    return this._panelEl = this._panelEl || $(this.el).parents('.panel_content')[0];
  },

  _createPublishMenu : function() {
    return new dc.ui.Menu({
      label   : 'Publish',
      items   : [
        {title : 'Embed Document Viewer',    onClick : this.displayEmbedSnippet},
        {title : 'Download Document Viewer', onClick : Documents.downloadSelectedViewers},
        {title : 'Download Original PDF',    onClick : Documents.downloadSelectedPDF},
        {title : 'Download Full Text',       onClick : Documents.downloadSelectedFullText}
      ],
      onOpen : function(menu) {
        $('.menu_item', menu.content).toggleClass('disabled', !Documents.selectedCount);
      }
    });
  },

  _createEditMenu : function() {
    return new dc.ui.Menu({
      label   : 'Edit',
      items   : [
        {title : 'Edit Title',           attrs: {'class' : 'singular'}, onClick : this.editTitle},
        {title : 'Edit Description',     attrs: {'class' : 'singular'}, onClick : this.editDescription},
        {title : 'Edit Source',          attrs: {'class' : 'multiple'}, onClick : this.editSource},
        {title : 'Edit Related Article', attrs: {'class' : 'multiple'}, onClick : this.editRelatedArticle},
        {title : 'Edit Access Level',    attrs: {'class' : 'multiple'}, onClick : this.editAccess},
        {title : 'Delete Documents',     attrs: {'class' : 'multiple warn'}, onClick : this._deleteSelectedDocuments}
      ],
      onOpen : function(menu) {
        var count = Documents.selectedCount;
        if (count == 0) {
          $('.menu_item', menu.content).addClass('disabled');
        } else {
          $('.menu_item', menu.content).removeClass('disabled');
          $('.singular', menu.content).toggleClass('disabled', count > 1);
        }
      }
    });
  },

  _openViewers : function() {
    if (!Documents.selectedCount) return dc.ui.Dialog.alert('Please select a document to open.');
    _.each(Documents.selected(), function(doc){ doc.openViewer(); });
  }

});