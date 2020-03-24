module.exports = {
  transpileDependencies: [
    'vuetify',
  ],
  chainWebpack: (config) => {
    config
      .plugin('html')
      .tap((args) => {
        args[0].title = 'Challenge'; // eslint-disable-line no-param-reassign
        return args;
      });
  },
};
