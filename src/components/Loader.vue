<script>
import VProgressCircular from 'vuetify/lib/components/VProgressCircular'

export default VProgressCircular.extend({
  name: 'Loader',
  props: {
    indeterminate: {
      default: true,
    },
    width: {
      default: 2,
    },
    color: {
      default: 'primary',
    },
  },
})
</script>
