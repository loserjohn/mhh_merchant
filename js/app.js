(function(owner) {

	var holdTime; /* 免登时长 （ms）  一周*/ //判断忆否已经存在openid，没有则不自动登陆
	//	owner.holdTime = 60000;
	var opId; //最后的登陆时间

	var lastLoginTime; //	计算距上次登陆的时间差

	var lastLoginWay; // 最后的登陆方式 1 为账号登陆,2为微信登陆

	var userName; // 	用户名

	var userPass; // 用户密码

	var CryptoJS; //加密对象
	var auths = {} /* 授权登陆通道对象 */ //仅仅针对微信
	var home; //存放主页面
	var authBtns = ['weixin'];
	owner.isIPhoneX = /iphone/gi.test(window.navigator.userAgent) && window.devicePixelRatio && window.devicePixelRatio === 3 && window.screen.width === 375 && window.screen.height === 812;

	mui.plusReady(function() {
		plus.navigator.setStatusBarStyle('light');
		plus.runtime.setBadgeNumber(0);
		holdTime = 604800000; /* 免登时长 （ms）  一周*/ //判断忆否已经存在openid，没有则不自动登陆
		//	owner.holdTime = 60000;
		opId = plus.storage.getItem('opId'); //最后的openid

		lastLoginTime = plus.storage.getItem('lastLoginTime'); //	最后的登陆方式 1 为账号登陆,2为微信登陆

		lastLoginWay = plus.storage.getItem('lastLoginWay'); // 用户名

		userName = plus.storage.getItem('userName'); // 用户密码	

		userPass = plus.storage.getItem('userPass'); // 计算距上次登陆的时间差		
		plus.webview.currentWebview().setStyle({
			scrollIndicator: 'none'
		});

	})

	/* 域名 */
	//	owner.baseUrl = "http://192.168.1.6:8089/Data"
	//	owner.baseUrl = "http://mobile.mhh999.com"
	owner.baseUrl = "https://mobile.mhh999.com"

	/* 初始化沉浸式导航栏 */
	owner.initHeader = function() {
		var isImmersedStatusbar = plus.navigator.isImmersedStatusbar();
		var StatusbarHeight = plus.navigator.getStatusbarHeight();

		var headerH = document.getElementById('header').offsetHeight;

		//		alert(isIPhoneX)

		if(owner.isIPhoneX) {
			document.getElementById('header').style.height = headerH + 44 + 'px';
			document.getElementById('header').style.paddingTop = 44 + 'px';
			if(document.getElementById('content')) {
				document.getElementById('content').style.paddingTop = headerH + 44 + 'px';
			}
		} else {
			document.getElementById('header').style.height = headerH + StatusbarHeight + 'px';
			document.getElementById('header').style.paddingTop = StatusbarHeight + 'px';
			if(document.getElementById('content')) {
				document.getElementById('content').style.paddingTop = headerH + StatusbarHeight + 'px';
			}
		}

	}
	//***************用户登陆身份操作部分***************	
	/*传入加密对象*/
	owner.WXinit = function(obj) {
		CryptoJS = obj;

	}

	//	推送部分
	owner.pushInit = function() {
		var info = plus.push.getClientInfo();
		//		透传消息监听
		plus.push.addEventListener("receive", function(msg) {
			//			新消息红点提示
			//			alert('receive')
			if(plus.os.name == "iOS") {
				switch(msg.payload) {
					case "LocalMSG":
						/*本地消息*/

						if(plus.webview.getWebviewById('information')) {
							plus.webview.getWebviewById('information').evalJS('redSet(' + JSON.stringify(msg.content) + ')')
						}

						break;
					default:
						/*收到离线推送消息，则创建本地消息*/
						owner.createLocalPushMsg(msg);
						//						if(plus.webview.getWebviewById('information')){
						//							plus.webview.getWebviewById('information').evalJS('redSet()')
						//						}
						break;
				}
			} else {
				//				plus.nativeUI.alert(msg.content);
				if(plus.webview.getWebviewById('information')) {
					plus.webview.getWebviewById('information').evalJS('redSet(' + JSON.stringify(msg.content) + ')')
				}
			}

			//				plus.nativeUI.alert(msg.content);
		}, false);
		//		点击消息监听
		plus.push.addEventListener("click", function(msg) {
			switch(msg.payload) {
				case "LocalMSG":
					/*本地消息*/
					break;
				default:

					break;
			}
			mui.openWindow({
				url: './html/information/sysMessage.html',
				id: 'sysMessage',
				styles: {
					top: '0px', //新页面顶部位置
					bottom: '0px', //新页面底部位置
					scrollIndicator: "none",
					plusrequire: 'ahead'
				},
				show: {
					autoShow: true, //页面loaded事件发生后自动显示，默认为true
					duration: 300 //页面动画持续时间，Android平台默认100毫秒，iOS平台默认200毫秒；
				},
				extras: {},
				waiting: {
					autoShow: true, //自动显示等待框，默认为true
					title: '正在加载...', //等待对话框上显示的提示内容
				}
			})
		}, false);　
	}
	//	创建本地消息
	owner.createLocalPushMsg = function(msg) {
		//		alert('本地信息')
		var options = {
			cover: false
		};
		plus.push.createMessage(msg.content, "LocalMSG", options);

		//		if(plus.os.name == "iOS") {
		//			alert('*如果无法创建消息，请到"设置"->"通知"中配置应用在通知中心显示!');
		//		}
	}

	/**
	 * 用户自动登录
	 **/
	owner.autoLogin = function() {
		//						获取微信免登的服务通道
		plus.oauth.getServices(function(services) {
			for(var i in services) {
				var service = services[i];
				//				console.log(service.id)
				if(service.id == 'weixin') {
					auths.s_name = 'weixin';
					auths.s_server = service;
				}
			}
		}, function(e) {
			plus.nativeUI.toast("获取登录认证失败：" + e.message);
		});
		var time;
		if(!lastLoginWay || !lastLoginTime) {
			plus.navigator.closeSplashscreen();
			return
		};
		time = new Date().getTime() - parseInt(lastLoginTime);
		/*判断登陆方式*/

		switch(lastLoginWay) {
			/* 最后的登陆方式               1 为账号登陆 */
			case '1':
				//							alert('账号登陆')
				//	判断是否过期
				if(!userName || !userPass) return;

				if(time && time <= holdTime) {
					/* 未过期 */
					owner._toMain(1)
				} else {
					/* 过期 */
					//					mui.toast('账号密码过期,请手动登陆');
				}
				break;
			case '2':
				/* 2为微信登陆
				判断是否过期 */
				if(!opId) return;
				if(time <= holdTime) {
					/* 未过期 */
					owner._toMain(2);
				} else {
					/* 不存在则重新登陆 */

					//					mui.toast('微信登陆过期,请重新授权');
				}
				break;
			default:
				break;
		}

	}
	/*微信重新调用授权 自动登陆*/
	owner.reWxLogin = function() {
		var auth = auths.s_server;
		plus.nativeUI.showWaiting();
		if(auth.authResult && auth.userInfo) {
			// 已经授权
			plus.storage.setItem('lastLoginWay', '2');
			var t = new Date().getTime().toString();
			plus.storage.setItem('lastLoginTime', t.toString());
			plus.nativeUI.close();
			owner._toMain(2);
		} else {
			// 没有授权
			waiting.close();
			owner.wxOAuth();
		}
	}
	/*微信授权*/
	owner.wxOAuth = function(callback) {
		//		plus.nativeUI.showWaiting()
		var times = setInterval(function() {
			if(!auths.s_server) return;
			//			console.log(auths)
			var auth = auths.s_server;
			auth.login(function() {
				//plus.nativeUI.toast("登录认证成功");
				auth.getUserInfo(function(e) {
					var result = e.target.authResult;
					var info = e.target.userInfo;
					plus.storage.setItem('opId', result.openid);
					plus.storage.setItem('pic_head', info.headimgurl);
					plus.storage.setItem('petname', info.nickname);
					var t = new Date().getTime().toString();
					/* 获取信息后等注销 */
					owner._toMain(2)
				}, function(e) {
					plus.nativeUI.closeWaiting()
					plus.nativeUI.toast("获取用户信息失败：" + e.message);
				});
			}, function(e) {
				plus.nativeUI.closeWaiting()
				plus.nativeUI.toast("登录认证失败：" + e.message);
			});
			clearInterval(times);
		}, 200)
	}
	/*直接使用本地密码账号登陆*/
	owner._toMain = function(k) {
		plus.nativeUI.showWaiting()
		var key = k;
		switch(key) {
			case 1:
				//账号自动登陆
				var rPass = plus.storage.getItem('userPass');
				var userName = plus.storage.getItem('userName');
				var data = {
					rpass: rPass,
					username: userName,
					password: owner._Encrypt(rPass),
					type: 3
				}
				/* 账号登陆 */
				owner.zhlogin(data, function(status, msg) {
					plus.nativeUI.closeWaiting();
					plus.navigator.closeSplashscreen()
					if(status) {
						home.show('pop-in', 300, function() {}, {});

					} else {
						plus.nativeUI.toast(msg)
					}
				})

				break;
			case 2:
				//微信账号自动登陆
				var opid = plus.storage.getItem('opId');
				var data = {
					opid: opid,
					aseopid: owner._Encrypt(opid),
					type: 2
				}

				/* 微信登陆 */
				owner.wxlogin(data, function(status, msg) {
					plus.nativeUI.closeWaiting();
					plus.navigator.closeSplashscreen()
					if(status) {
						home.show('pop-in', 300, function() {}, {});
					} else {
						plus.nativeUI.toast(msg);
						if(msg == '微信登陆用户不存在') {
							mui.openWindow({
								url: './bound.html',
								id: 'bound',
								styles: {
									top: '0px', //新页面顶部位置
									bottom: '0px', //新页面底部位置
									scrollIndicator: "none",
									plusrequire: 'ahead',
									// 窗口参数 参考5+规范中的WebviewStyle,也就是说WebviewStyle下的参数都可以在此设置
									titleNView: { // 窗口的标题栏控件
										autoBackButton: true, // 标题栏文字,当不设置此属性时，默认加载当前页面的标题，并自动更新页面的标题
										titleColor: "#fff", // 字体颜色,颜色值格式为"#RRGGBB",默认值为"#000000"
										titleSize: "14px", // 字体大小,默认17px
										backgroundColor: "#151515", // 控件背景颜色,颜色值格式为"#RRGGBB",默认值为"#F7F7F7"
										progress: { // 标题栏控件的进度条样式
											color: "#ccaa42", // 进度条颜色,默认值为"#00FF00"  
											height: "2px" // 进度条高度,默认值为"2px"         
										},
										splitLine: { // 标题栏控件的底部分割线，类似borderBottom
											color: "#404040", // 分割线颜色,默认值为"#CCCCCC"  
											height: "1px" // 分割线高度,默认值为"2px"
										}
									}
								},
								show: {
									autoShow: true, //页面loaded事件发生后自动显示，默认为true
									duration: 300 //页面动画持续时间，Android平台默认100毫秒，iOS平台默认200毫秒；
								},
								extras: {},
								waiting: {
									autoShow: true, //自动显示等待框，默认为true
									title: '正在加载...', //等待对话框上显示的提示内容
								}
							})
						}
					}
				})
				break;
			default:
				break;
		}
	}

	/* 账号登陆 */
	owner.zhlogin = function(loginInfo, callback) {
		callback = callback || $.noop;
		var Info = {};
		Info.username = loginInfo.username || '';
		Info.password = loginInfo.password || '';
		Info.type = loginInfo.type || '';
		mui.ajax(app.baseUrl + '/api/Authorize/Token', {
			data: Info,
			// dataType:'json',//服务器返回json格式数据
			type: 'post', //HTTP请求类型
			timeout: 10000, //超时时间设置为10秒；
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			success: function(result) {
				/*登陆成功*/
				if(result.Success) {
					// 储存本地 记录登陆时间
					plus.storage.setItem('userName', Info.username.toString());
					plus.storage.setItem('userPass', loginInfo.rpass);
					plus.storage.setItem('lastLoginWay', '1');

					var t = new Date().getTime().toString();
					plus.storage.setItem('lastLoginTime', t.toString());
					/* 储存有效token */
					plus.storage.setItem('token', result.Msg);
					if(result.Data) {
						/*验证码登陆,返回密码存储*/
						plus.storage.setItem('userPass', result.Data);
					}
					//					if(result.DataExt) {
					//						/*储存token过期的时间*/
					//						plus.storage.setItem('tokenLife', result.DataExt);
					//					}

					lastLoginTime = plus.storage.getItem('lastLoginTime');

					lastLoginWay = plus.storage.getItem('lastLoginWay');

					userName = plus.storage.getItem('userName');

					userPass = plus.storage.getItem('userPass');

					owner.postDevice() //发送设备uid -- 个推

					var userstatus = parseInt(result.Type);
					/*返回用户的状态码*/
					switch(userstatus) {
						case 0:
							/*未填写资料   --->跳转至资料填写页面*/
							plus.nativeUI.closeWaiting();
							owner.jumpPage('msg')

							break;
						case 1:
							/*已经认证 -- 直接回掉*/
							//							plus.nativeUI.toast('账号登陆成功')
							owner.initHome(callback)
							break;
						case 2:
							/*认证中 -- 跳转至审核中页面*/
							plus.nativeUI.closeWaiting();
							owner.jumpAuding('auditing')
							break;
						case 3:
							/*认证失败   提示认证是白 重新填写信息*/
							plus.nativeUI.closeWaiting();
							plus.nativeUI.alert('对不起.您所提交的商家资格未通过平台审核,请重新填写', function() {
								owner.jumpPage('msg')
							}, '马嘿嘿提醒您')

							break;
						default:
							break;
					}

				} else {
					/*验证失败*/
					if(callback) callback(false, result.Msg)

				}
			},
			error: function(xhr, type, errorThrown) {
				//异常处理；
				owner.catchErr(type, errorThrown);
			}
		});
	}

	/* 微信登陆 */
	owner.wxlogin = function(loginInfo, callback) {

		callback = callback || $.noop;
		var Info = {};
		Info.aesOpenid = loginInfo.aseopid || '';
		Info.type = loginInfo.type || '';

		mui.ajax(app.baseUrl + '/api/Authorize/OpenidToken', {
			data: Info,
			// dataType:'json',//服务器返回json格式数据
			type: 'post', //HTTP请求类型
			timeout: 10000, //超时时间设置为10秒；
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			success: function(result) {
				/*登陆成功*/
				if(result.Success) {
					//					alert('状态' + result.Type)
					// 储存本地 记录登陆时间
					plus.storage.setItem('opId', loginInfo.opid);
					plus.storage.setItem('lastLoginWay', '2');
					var t = new Date().getTime().toString();
					plus.storage.setItem('lastLoginTime', t.toString());
					/* 储存有效token */
					plus.storage.setItem('token', result.Msg);
					//					if(result.DataExt) {
					//						/*储存token过期的时间*/
					//						plus.storage.setItem('tokenLife', result.DataExt);
					//					}

					opId = plus.storage.getItem('opId');

					lastLoginTime = plus.storage.getItem('lastLoginTime');

					lastLoginWay = plus.storage.getItem('lastLoginWay');

					owner.postDevice() //发送uid --个推

					var userstatus = parseInt(result.Type);
					/*返回用户的状态码*/
					switch(userstatus) {

						case 0:
							/*未填写资料   --->跳转至资料填写页面*/
							plus.nativeUI.closeWaiting();
							owner.jumpPage('msg')
							break;
						case 1:
							/*已经认证 -- 直接回掉*/
							//							plus.nativeUI.toast('微信登陆成功')
							owner.initHome(callback)

							break;
						case 2:
							/*认证中 -- 跳转至审核中页面*/
							plus.nativeUI.closeWaiting();
							owner.jumpAuding('auditing')
							break;
						case 3:
							/*认证失败   提示认证是白 重新填写信息*/
							plus.nativeUI.closeWaiting();
							owner.jumpPage('msg')
							break;
						default:
							break;
					}

				} else {
					/*验证失败*/
					if(callback) callback(false, result.Msg)

				}
			},
			error: function(xhr, type, errorThrown) {
				owner.catchErr(type, errorThrown);
			}
		});
	}
	//	发送cid
	owner.postDevice = function() {
		//		alert(1)
		var info = plus.push.getClientInfo();
		//		console.log(info.clientid)
		var cid = info.clientid;
		var device;
		if(mui.os.ios) {
			device = 2
		} else {
			device = 1
		}
		mui.ajax(app.baseUrl + '/api/BusiAccount/BandUserCid', {
			data: {
				cid: cid,
				deviceType: device
			},
			type: 'post', //HTTP请求类型
			timeout: 10000, //超时时间设置为10秒；
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Authorization': owner.mark + plus.storage.getItem('token')
			},
			success: function(result) {
				//				alert(cid)
			},
			error: function(xhr, type, errorThrown) {
				//				alert('GTerror')
			}
		});

		//		获取融云token
		app.ajax(app.baseUrl + '/api/BusiAccount/Ry_Token', {
			type: 'post', //HTTP请求类型
			success: function(result) {
				if(result.Success) {
					plus.storage.setItem('IMtoken', result.Msg);
					plus.storage.setItem('myId', result.Data)
				} else {}
			}
		});

	}
	//	预加载首页
	owner.initHome = function(callback) {
		home = home || plus.webview.create('./html/home/home.html', 'home', {
			popGesture: 'none',
			subNViews: [{
				id: 'tabBar',
				styles: {
					"bottom": "0px",
					"left": "0",
					"height": "50px",
					"width": "100%",
					"backgroundColor": "#171717"
				},
				tags: [{
						"tag": "font",
						"id": "homeIcon",
						"text": "\ue605",
						"position": {
							"top": "4px",
							"left": "0",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"fontSrc": "_www/fonts/iconfont.ttf",
							"align": "center",
							"size": "24px"
						}
					}, {
						"tag": "font",
						"id": "homeText",
						"text": "技师首页",
						"position": {
							"top": "23px",
							"left": "0",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"align": "center",
							"size": "10px"
						}
					}, {
						"tag": "font",
						"id": "communityIcon",
						"text": "\ue60a",
						"position": {
							"top": "4px",
							"left": "25%",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"fontSrc": "_www/fonts/iconfont.ttf",
							"align": "center",
							"size": "24px"
						}
					}, {
						"tag": "font",
						"id": "communityText",
						"text": "小草社区",
						"position": {
							"top": "23px",
							"left": "25%",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"align": "center",
							"size": "10px"
						}
					}, {
						"tag": "font",
						"id": "contactIcon",
						"text": "\ue6ad",
						"position": {
							"top": "4px",
							"left": "50%",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"fontSrc": "_www/fonts/iconfont.ttf",
							"align": "center",
							"size": "24px"
						}
					}, {
						"tag": "font",
						"id": "contactText",
						"text": "消息",
						"position": {
							"top": "24px",
							"left": "50%",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"align": "center",
							"size": "10px"
						}
					}, {
						"tag": "font",
						"id": "manageIcon",
						"text": "\ue61c",
						"position": {
							"top": "4px",
							"left": "75%",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"fontSrc": "_www/fonts/iconfont.ttf",
							"align": "center",
							"size": "24px"
						}
					}, {
						"tag": "font",
						"id": "manageText",
						"text": "商铺管理",
						"position": {
							"top": "24px",
							"left": "75%",
							"width": "25%",
							"height": "24px"
						},
						"textStyles": {
							"align": "center",
							"size": "10px"
						}
					},
					{
						"tag": "rect",
						"id": "tabBorder",
						"position": {
							"top": "0",
							"left": "0",
							"width": "100%",
							"height": "1px"
						},
						"rectStyles": {
							"color": "#ccc"
						}
					}
				]
			}]
		});
		home.onloaded = function() {
			mui.later(function() {
				owner.pushInit()
				if(callback) callback(true)
			}, 500)
		}
	}

	owner.jumpAuding = function() {
		mui.openWindow({
			url: './' + id + '.html',
			id: id,
			styles: {
				top: '0px', //新页面顶部位置
				bottom: '0px', //新页面底部位置
				scrollIndicator: "none",
				plusrequire: 'ahead',

			},
			show: {
				autoShow: true, //页面loaded事件发生后自动显示，默认为true
				duration: 300 //页面动画持续时间，Android平台默认100毫秒，iOS平台默认200毫秒；
			},
			extras: {
				//自定义扩展参数，可以用来处理页面间传值  
			},
			waiting: {
				autoShow: false, //自动显示等待框，默认为true
				title: '正在加载...', //等待对话框上显示的提示内容
			}
		})
	}

	/*页面跳转*/
	owner.jumpPage = function(id) {
		mui.openWindow({
			url: './' + id + '.html',
			id: id,
			styles: {
				top: '0px', //新页面顶部位置
				bottom: '0px', //新页面底部位置
				scrollIndicator: "none",
				plusrequire: 'ahead',
				// 窗口参数 参考5+规范中的WebviewStyle,也就是说WebviewStyle下的参数都可以在此设置
				titleNView: { // 窗口的标题栏控件
					autoBackButton: true, // 标题栏文字,当不设置此属性时，默认加载当前页面的标题，并自动更新页面的标题
					titleColor: "#fff", // 字体颜色,颜色值格式为"#RRGGBB",默认值为"#000000"
					titleSize: "14px", // 字体大小,默认17px
					backgroundColor: "#151515", // 控件背景颜色,颜色值格式为"#RRGGBB",默认值为"#F7F7F7"
					progress: { // 标题栏控件的进度条样式
						color: "#ccaa42", // 进度条颜色,默认值为"#00FF00"  
						height: "2px" // 进度条高度,默认值为"2px"         
					},
					splitLine: { // 标题栏控件的底部分割线，类似borderBottom
						color: "#404040", // 分割线颜色,默认值为"#CCCCCC"  
						height: "1px" // 分割线高度,默认值为"2px"
					}
				}
			},
			show: {
				autoShow: true, //页面loaded事件发生后自动显示，默认为true
				duration: 300 //页面动画持续时间，Android平台默认100毫秒，iOS平台默认200毫秒；
			},
			extras: {
				//自定义扩展参数，可以用来处理页面间传值  
			},
			waiting: {
				autoShow: false, //自动显示等待框，默认为true
				title: '正在加载...', //等待对话框上显示的提示内容
			}
		})
	}
	// 注册接口
	owner.registe = function(loginInfo, callback, type) {
		callback = callback || $.noop;
		var Info = {};

		Info.mobile = loginInfo.mobile || '';
		Info.password = loginInfo.aespassword || '';
		Info.validate = loginInfo.validate || '';
		Info.parent = loginInfo.parent || '';
		Info.type = loginInfo.type || '';
		Info.pic_head = loginInfo.pic_head || '';
		Info.petname = loginInfo.petname || '';
		Info.openid = loginInfo.aesopenid || '';

		mui.ajax(app.baseUrl + '/api/Authorize/Registe', {
			data: Info,
			type: 'post', //HTTP请求类型
			timeout: 10000, //超时时间设置为10秒；
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			success: function(result) {
				/*注册成功*/
				if(result.Success) {
					// 储存本地 记录登陆时间
					//					alert(Info.mobile)
					plus.storage.setItem('userName', Info.mobile.toString());
					plus.storage.setItem('userPass', loginInfo.password);
					plus.storage.setItem('pic_head', Info.pic_head);
					var t = new Date().getTime().toString();
					plus.storage.setItem('lastLoginTime', t.toString());

					owner._toMain(1);
					//					if(callback) callback(true, null)

				} else {
					/*验证失败*/
					if(callback) callback(false, result.Msg)

				}
			},
			error: function(xhr, type, errorThrown) {
				owner.catchErr(type, errorThrown);
			}
		});
	}
	/* 获取验证码 */
	owner.getValidate = function(phone, type, callback) {
		callback = callback || $.noop;
		var Info = {};
		Info.mobile = phone || '';
		Info.type = type || '';

		mui.ajax(app.baseUrl + '/api/Msg/SendVerificationCode', {
			data: Info,
			// dataType:'json',//服务器返回json格式数据
			type: 'post', //HTTP请求类型
			timeout: 6000, //超时时间设置为10秒；
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			success: function(result) {
				/*登陆成功*/
				if(result.Success) {
					// 储存本地 记录登陆时间							
					if(callback) callback(true, null)

				} else {
					/*验证失败*/
					if(callback) callback(false, result.Msg)
				}
			},
			error: function(xhr, type, errorThrown) {
				//异常处理；
				owner.catchErr(type, errorThrown);
			}
		});
	}

	owner._KEY = "/fjdmllfjdmllfjdmllfjdmllfjdmll/"
	owner._IV = "1234567890000000"
	owner.mark = "Bearer "
	//	***************通用函数****************
	/*手机校验*/
	owner.checkPhone = function(str) {
		var r = (/^1[345789]\d{9}$/.test(str))
		return r
	}
	/*银行卡校验*/
	owner.rightCard = function(str) {
		var reg = /^([1-9]{1})(\d{15}|\d{18})$/; // 以19位数字开头，以19位数字结尾 
		return reg.test(str)
	}
	/*选择图片*/
	owner.getIMG = function(title, callback) {

		if(mui.os.plus) {
			var a = [{
				title: '拍照'
			}, {
				title: '从手机相册选择'
			}];
			plus.nativeUI.actionSheet({
				title: title,
				cancel: '取消',
				buttons: a
			}, function(b) {

				switch(b.index) {
					case 0:
						break;
					case 1:
						//拍照 

						owner.cameraImages(function(src) {
							if(callback) callback(src);
						});

						break;
					case 2:
						//打开相册 
						owner.galleryImages(1, function(src) {
							if(callback) callback(src);
						});

						break;
					default:
						break;
				}
			}, false);
		}
	}
	/*从相册获取图片*/
	owner.galleryImages = function(num, callback) {
		// 从相册中选择图片
		plus.gallery.pick(function(e) {

			var fileSrc = e.files[0]
			//			alert(fileSrc)
			owner.uploadIMG64(fileSrc, function(src) {
				if(callback) callback(src);
			})
		}, function(e) {
			plus.nativeUI.closeWaiting();
			console.log("取消选择图片");
		}, {
			filter: "image",
			multiple: true,
			maximum: num,
			system: false,
			onmaxed: function() {
				plus.nativeUI.alert('最多只能选择' + num + '张图片');
			}
		});
	}
	/*拍照获取图片--  单张*/
	owner.cameraImages = function(callback) {
		var mobileCamera = plus.camera.getCamera();
		mobileCamera.captureImage(function(e) {
			plus.io.resolveLocalFileSystemURL(e, function(entry) {
				var path = entry.toLocalURL();
				owner.uploadIMG64(path, function(src) {
					if(callback) callback(src);
				})
			}, function(err) {
				console.log("读取拍照文件错误");
			});
		}, function(e) {
			console.log("er", err);
		}, function() {
			filename: '_doc/head.png';
		});
	}
	/*图片上传*/
	owner.uploadIMG64 = function(src, callback) {
		plus.nativeUI.showWaiting();
		var img = new Image();
		//		压缩图片
		owner.zipPic(src, function(dsrc) {
			img.src = dsrc;
			img.onload = function() {
				var r = owner.getBase64Image(img)
				var dstsrc = r.url
				var ext = r.ext

				var Info = {
					image_base64: dstsrc,
					file_name: '.jpg',
					foldName: plus.storage.getItem('userName'),
					size: 1,
					isPrj: false
				}
				//			console.log(dstsrc)
				mui.ajax(owner.baseUrl + '/api/Upload/UploadByBase64', {
					data: Info,
					dataType: 'json', //服务器返回json格式数据
					type: 'post', //HTTP请求类型
					timeout: 10000, //超时时间设置为10秒；
					headers: {
						'Content-Type': 'application/json'
					},
					success: function(result) {
						if(callback) callback(result.Data);
						mui.later(function() {
							plus.nativeUI.closeWaiting();
						}, 2500)
					},
					error: function(xhr, type, errorThrown) {
						plus.nativeUI.closeWaiting();
					}
				})
			}

		})

	}
	//	压缩图片
	owner.zipPic = function(src, callback) {
		console.log('ZIP--' + src)
		plus.zip.compressImage({
			src: src,
			dst: '_doc/zip_' + src.substr(src.lastIndexOf('/') + 1),
			overwrite: true,
			quality: 100,
			format: 'jpg'
		}, function(zip) {
			plus.nativeUI.closeWaiting();
			if(callback)(callback(zip.target))
		}, function() {
			plus.nativeUI.closeWaiting();
			mui.toast('压缩失败！');
		})
	}
	/*base64*/
	owner.getBase64Image = function(img) {
		var canvas = document.createElement("canvas"); //创建canvas DOM元素，并设置其宽高和图片一样
		var radio = img.width / img.height
		canvas.width = 1000;
		canvas.height = canvas.width / radio;

		var ctx = canvas.getContext("2d");
		ctx.drawImage(img, 0, 0, canvas.width, canvas.height); //使用画布画图
		var ext = img.src.substring(img.src.lastIndexOf(".") + 1).toLowerCase(); //动态截取图片的格式
		var dataURL = canvas.toDataURL("image/jpg"); //返回的是一串Base64编码的URL并指定格式
		return {
			url: dataURL,
			ext: ext
		};
	}

	/*封装mui.ajax*/
	owner.ajax = function(url, option) {
		var curTime = new Date().getTime();
		//		var tokenLife = plus.storage.getItem('tokenLife');
		option.timeout = 10000;
		option.headers = {
			'Content-Type': 'application/x-www-form-urlencoded',
			'Authorization': owner.mark + plus.storage.getItem('token')
		}

		option.error = function(xhr, type, errorThrown) {
			plus.nativeUI.closeWaiting();
			if(type == 'timeout' || type == "abort") {

				plus.nativeUI.toast('网络超时！请稍后重试')
			} else if(errorThrown == 'Unauthorized') {
				/*	自动重新登陆*/
				owner.autoLogin()
			} else {
				plus.nativeUI.toast('未知错误')
			}
		}
		mui.ajax(url, option)

	}
	//	错误捕获
	owner.catchErr = function(type, errorThrown) {
		plus.nativeUI.closeWaiting()
		if(type == 'abort' || type == 'timeout') {
			plus.nativeUI.toast('网络不佳');
		} else if(errorThrown == 'Unauthorized') {
			/*	自动重新登陆*/
			owner.autoLogin()
		} else {
			plus.nativeUI.toast('未知错误');
		}
	}
	/*加密函数*/
	owner._Encrypt = function(str) {
		//		alert(1)
		str = str + '|.|' + new Date().getTime()
		var key = CryptoJS.enc.Utf8.parse(owner._KEY);
		var iv = CryptoJS.enc.Utf8.parse(owner._IV);
		var encrypted = '';
		var srcs = CryptoJS.enc.Utf8.parse(str);
		encrypted = CryptoJS.AES.encrypt(srcs, key, {
			iv: iv,
			mode: CryptoJS.mode.CBC,
			padding: CryptoJS.pad.Pkcs7
		});
		return encrypted.ciphertext.toString();
	}
	//	倒计时
	owner.resttime = function(time) {
		//2018/12/1
		time = new Date(time)
		var leftTime = time.getTime() - new Date().getTime(); //计算剩余的毫秒数 
		var date, h, m, s
		if(leftTime > 0) {
			var days = parseInt(leftTime / 1000 / 60 / 60 / 24, 10); //计算剩余的天数 
			var hours = parseInt(leftTime / 1000 / 60 / 60 % 24, 10); //计算剩余的小时 
			var minutes = parseInt(leftTime / 1000 / 60 % 60, 10); //计算剩余的分钟 
			var seconds = parseInt(leftTime / 1000 % 60, 10); //计算剩余的秒数 
			// console.log(leftTime,days,hours)
			date = checkTime(days);
			h = checkTime(hours);
			m = checkTime(minutes);
			s = checkTime(seconds);
		} else {
			date = '--';
			h = '--';
			m = '--';
			s = '--';
		}
		var html = '<span class="cor_w">报名倒计时:</span><aside  class="flex"><div class="rest">' + date + '</div></aside><span class="cor_w">天</span><span class="cor_w">:</span><aside class="flex"><div class="rest">' + h + '</div></aside><span class="cor_w">时</span><span class="cor_w">:</span><aside class="flex"><div class="rest">' + m + '</div></aside><span class="cor_w">分</span><span class="cor_w">:</span><aside class="flex"><div class="rest">' + s + '</div></aside><span class="cor_w">秒</span>'
		//		return {
		//			date: date,
		//			h: h,
		//			m: m,
		//			s: s
		//		}
		return html
	}
	var checkTime = function(i) { //将0-9的数字前面加上0，例1变为01 
		if(i < 10) {
			i = "0" + i;
		}
		return i.toString();
	}

	//	owner.navigater = function(dstUrl, dstId, extras,option) {
	//		extras = extras || {};
	//		default = {
	//			showTitle:false,
	//			autoShow:true,
	//			autoWaiting:true
	//			
	//		}
	//
	//		mui.openWindow({
	//			url: dstUrl,
	//			id: dstId,
	//			styles: {
	//				top: '0px', //新页面顶部位置
	//				bottom: '0px', //新页面底部位置
	//				scrollIndicator: "none",
	//				plusrequire: 'ahead'
	//			},
	//			createNew: false, //是否重复创建同样id的webview，默认为false:不重复创建，直接显示
	//			show: {
	//				autoShow: false, //页面loaded事件发生后自动显示，默认为true
	//				duration: 300 //页面动画持续时间，Android平台默认100毫秒，iOS平台默认200毫秒；
	//			},
	//			extras: extras,
	//			waiting: {
	//				autoShow: true, //自动显示等待框，默认为true
	//				title: '正在加载...', //等待对话框上显示的提示内容
	//			}
	//		})
	//	}
}(window.app = {}));