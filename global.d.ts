/// <reference types='@dcloudio/types' />

export {};

declare global {
  type HexColor = `#${string}`;

  interface UniPageStyle {
    navigationBarBackgroundColor?: HexColor;
    navigationBarTextStyle?: string;
    navigationBarTitleText?: string;
    navigationStyle?: "default" | "custom";
    backgroundTextStyle?: "dark" | "light";
    enablePullDownRefresh?: boolean;
    onReachBottomDistance?: number;
  }

  interface UniPage {
    path: string;
    needLogin?: boolean;
    style?: UniPageStyle;
  }

  interface UniTabBarItemIconFont {
    text?: string;
    color?: string;
    fontSize?: string;
    selectedColor?: string;
    selectedText?: string;
  }

  interface UniTabBarItem {
    pagePath: string;
    text: string;
    iconfont?: UniTabBarItemIconFont;
    iconPath?: string;
    selectedIconPath?: string;
    badge?: boolean | string;
  }

  interface UniTabBar {
    custom?: boolean;
    color: string;
    selectedColor: string;
    list: UniTabBarItem[];
  }

  interface UniEasycom {
    autoscan?: boolean;
    custom?: Record<string, string>;
  }

  interface UniIdRouter {
    loginPage: string;
    needLogin: string[];
  }

  interface UniAppPagesConfig {
    globalStyle?: UniPageStyle;
    pages?: UniPage[];
    easycom?: UniEasycom;
    tabBar?: UniTabBar;
    uniIdRouter?: UniIdRouter;
  }

  type UniDomEventTarget = {
    dataset: AnyObject;
    offsetLeft: number;
    offsetTop: number;
  };

  type UniEvent<Detail extends AnyObject = AnyObject> = {
    currentTarget: UniDomEventTarget;
    detail: Detail;
    preventDefault: Event["preventDefault"];
    stopPropagation: Event["stopPropagation"];
    target: UniDomEventTarget;
    timeStamp: number;
    type: string;
  };

  type UniInputDetail = {
    cursor: number;
    value: string;
  };

  type UniInputEvent = UniEvent<UniInputDetail>;

  type UniTapOrClickDetail = {
    x: number;
    y: number;
  };

  type UniTapEvent = UniEvent<UniTapOrClickDetail>;

  type UniGetPhoneNumberDetail = {
    code: string;
    encryptedData: string;
    errMsg: string;
    iv: string;
  };

  type UniGetPhoneNumberEvent = UniEvent<UniGetPhoneNumberDetail>;
}
