<script>
import VAutocomplete from 'vuetify/lib/components/VAutocomplete';

const ADD_NEW_KEY = '__new__';

export default VAutocomplete.extend({
  name: 'Picker',
  props: {
    hideNoData: {
      type: Boolean,
      default: true, // @mismith: default to true // @TODO: make true only if addNew is set
    },
    noDataText: {
      type: String,
      default: 'No matches',
    },
    addNew: {
      type: Function,
    },
    getAddNewText: {
      type: Function,
      default: (text) => `Add "${text}"`,
    },
  },
  computed: {
    filteredItems() {
      if (!this.isSearching || this.noFilter || this.internalSearch == null) {
        return this.allItems;
      }

      const filteredItems = this.allItems.filter((item) => this.filter(
        item,
        String(this.internalSearch),
        String(this.getText(item)),
      ));

      // @mismith: append item for adding a new entry
      if (this.addNew && this.internalSearch && !filteredItems.length) {
        filteredItems.push({
          [this.itemValue]: ADD_NEW_KEY,
          [this.itemText]: this.getAddNewText(this.internalSearch),
        });
      }

      return filteredItems;
    },
  },
  methods: {
    async selectItem(item) {
      // @mismith: convert / process special add new item into
      let newItem = item;
      const value = this.getValue(item);
      if (this.addNew && value === ADD_NEW_KEY) {
        newItem = await this.addNew(this.internalSearch);
      }

      this.internalSearch = null; // @mismith: reset input field

      // 'super'
      VAutocomplete.options.methods.selectItem.call(this, newItem);
    },
  },
});
</script>
