self.__MIDDLEWARE_MATCHERS = [
  {
    "regexp": "^\\/royal-epoxi-app(?:\\/(_next\\/data\\/[^/]{1,}))?(?:\\/((?!api).*))(\\.json|\\.rsc|\\.segments\\/.+\\.segment\\.rsc)?[\\/#\\?]?$",
    "originalSource": "/((?!api).*)"
  }
];self.__MIDDLEWARE_MATCHERS_CB && self.__MIDDLEWARE_MATCHERS_CB()