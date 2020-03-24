module.exports = {
  transpileDependencies: [
    'vuetify',
  ],
  chainWebpack: (config) => {
    config
      .plugin('html')
      .tap((args) => {
        args[0].title = 'challenge'; // eslint-disable-line no-param-reassign
        return args;
      });
  },
};
