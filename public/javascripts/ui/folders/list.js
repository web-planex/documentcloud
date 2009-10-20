dc.ui.FolderList = dc.View.extend({
  
  id : 'folder_list',
  
  constructor : function(options) {
    this.base(options);
    _.bindAll('ensurePopulated', 'renderFolders', 'addSavedSearch', 'removeSavedSearch', 'runSearch', this);
    dc.app.navigation.register('documents', this.ensurePopulated);
    SavedSearches.bind(dc.Set.MODEL_ADDED, this.addSavedSearch);
    SavedSearches.bind(dc.Set.MODEL_REMOVED, this.removeSavedSearch);
    $(this.el).html(dc.templates.FOLDER_LIST({}));
    this.searchesEl = $('#saved_searches', this.el);
  },
  
  ensurePopulated : function() {
    if (!SavedSearches.populated) SavedSearches.populate();
  },
  
  renderFolders : function() {
    
  },
  
  addSavedSearch : function(e, model) {
    this.searchesEl.append(new dc.ui.SavedSearch({model : model}).render().el);
  },
  
  removeSavedSearch : function(e, model) {
    $(model.view.el).remove();    
  }
  
});