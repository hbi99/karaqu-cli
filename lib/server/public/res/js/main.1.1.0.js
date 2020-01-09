
((window, document) => {
	"use strict";

	//window.onerror = function(sg, url, lineNo, columnNo, error) {
	//	console.log("Global error handler: ", arguments);
	//	return true;
	//};

	const defiant_ = {
		info_: document.documentElement.getAttribute("def-ant").split(":"),
		browser_: navigator.userAgent.match(/firefox|chrome|safari/i)[0].toLowerCase(),
		init_() {
			// fast references
			this.body_ = $("body");
			
			// root elements
			let els = [".menu-bar_", ".workspace-reel_", ".neo-desktop_", ".dock-wrapper_", ".neo-lasso_", ".menus-wrapper_", ".spotlight-wrapper_"].reverse();
			this.body_.prepend(els.map(i => `<div class="${i.slice(1)}"></div>`).join(""));

			for (let name in this) {
				if (typeof(this[name].init_) === "function") {
					this[name].init_();
				}
			}
		},
		// simple event emitter
		clearApp_(app) {
			for (let key in observerStack) {
				observerStack[key] = observerStack[key].filter(fn => fn.app !== app);
			}
		},
		once_: (type, fn) => {
			if (!stack[type]) {
				stack[type] = [];
			}
			stack[type].unshift(() => {
				fn();
				observer.off(type, fn);
			});
		},
		on_(type, fn, app) {
			if (!observerStack[type]) {
				observerStack[type] = [];
			}
			if (app) fn.app = app;
			observerStack[type].unshift(fn);
		},
		off_(type, fn) {
			if (!observerStack[type]) return;
			const i = observerStack[type].indexOf(fn);
			observerStack[type].splice(i, 1);
		},
		emit_(type, detail) {
			if (!observerStack[type]) return;
			const event = {
					type,
					isCanceled: false,
					cancelBubble() {
						this.isCanceled = true;
					}
				};
			
			if (detail) event.detail = detail;

			let len = observerStack[type].length;
			while (len--) {
				if (event.isCanceled) return;
				observerStack[type][len](event);
			}
			return event.detail;
		},
		sw_: 
// defiant_.sw_

{
	async init_() {
		// used for concurrency
		this.queue_ = {};
		this.forceRefresh_ = defiant_.info_[0] === "dev";

		// subscribe to events
		navigator.serviceWorker.addEventListener("message", this.receiveMessage_);
	},
	cacheIcons_(app, svgIcons, done) {
		let ticket = "t"+ Date.now(),
			icons = svgIcons.map(icon => {
				if (icon.nodeName) {
					if (icon.getAttribute("cache") === "false") return;
					// remove svg icon from DOM structure
					icon.parentNode.removeChild(icon);
				}
				// prepare for SW cache
				return {
					forceRefresh_: this.forceRefresh_,
					name: icon.name || icon.getAttribute("id"),
					svg: icon.str || icon.xml.replace(/\n/g, "").replace(/    /g, "")
				}
			}).filter(icon => icon);
		if (done) {
			// save ticket for concurrency
			this.queue_[ticket] = done;
		}
		// put icons in cache
		this.sendMessage_({type: "cache-icons", app, icons, ticket});
	},
	receiveMessage_(event) {
		let self = defiant_.sw_,
			data = event.data.msg;
		switch (data.type) {
			case "icons-cached":
				if (typeof self.queue_[data.ticket] === "function") {
					self.queue_[data.ticket]();
					delete self.queue_[data.ticket];
				}
				break;
			default:
				console.log("Received Message", data);
		}
	},
	sendMessage_(message) {
		navigator.serviceWorker.controller.postMessage(message);
	}
}
,
		i18n_: 
// defiant_.i18n_

{
	init_() {
		
	},
	translate_(word) {
		const xItem = defiant_.manager_.ledger_.selectSingleNode(`//i18n//*[@name="${word}"]`);
		
		if (xItem) {
			return xItem.getAttribute("value");
		}
	}
},
		menu_: 
// defiant_.menu_

{
	org_: {},
	init_() {
		// fast references
		this.doc_ = $(document);
		this.root_ = $("body > .menus-wrapper_");

		// attach contextmenu at root level
		this.doc_.find("body").attr({"data-context": "desktop"});

		// bind event handlers
		this.root_.on("mouseover mousedown", ".menu-item_, .hot-menu_, .color-select_", this.doEvent_);
		this.root_.on("mousedown input", this.doEvent_);
		this.doc_.on("contextmenu", "[data-context]", this.doEvent_);
		this.doc_.on("mousedown", "[data-menu]", event => {
			let el = $(event.target),
				target = el.attr("data-menu") ? el : el.parents("[data-menu]");
			this.doEvent_({type: "clear-contextmenu"});
			this.doEvent_({type: "trigger-contextmenu"}, target);
		});
	},
	doEvent_(event) {
		let manager = defiant_.manager_,
			workspace = defiant_.workspace_,
			self = defiant_.menu_,
			el = $(this),
			data = {},
			ctx,
			xPath,
			cGroup,
			cSiblings,
			xFor,
			name,
			entity,
			menu,
			parentEl,
			width,
			height,
			top,
			left,
			invoke,
			thisDim,
			ownerDim,
			action,
			isMenuBar,
			xMenuItem,
			winId;
		switch(event.type) {
			// native events
			case "input":
				el = $(event.target);
				// get menu node
				xMenuItem = manager.ledger_.selectSingleNode(`//Menu[@_id="${el.attr('_id')}"]`);

				// find out app
				winId = manager.ledger_.selectSingleNode(`//Application[.//*/@_id="${el.attr("_id")}"]//meta[@name="id"]`);
				winId = winId ? winId.getAttribute("value") : self.org_.winId_;

				// execute shell command, if any
				action = xMenuItem.getAttribute("shell");
				if (action) {
					return defiant_.shell_.execute_(`${action} ${el.val()}`, winId);
				}

				// forward command to application
				entity = defiant_.workSpace_.getEntity_(winId);

				if (entity && entity.app && typeof entity.app.dispatch === "function") {
					// pass along original event element and xmenu
					data.type = xMenuItem.getAttribute("change");
					data.arg = el.val();
					let res = entity.app.dispatch(data);
				}
				break;
			case "mouseover":
				if (el.hasClass("hot-menu_")) {
					if (el.attr("data-hotMenu") === self.org_.el_.attr("data-menu")) return;
					self.org_.el_.removeClass("menubar-active_");

					// purge adjacent siblings
					self.root_.find(".context-menu_").remove();

					parentEl = self.org_.el_.parent();
					el = parentEl.find(`[data-menu=${el.attr("data-hotMenu")}]`).addClass("menubar-active_");

					return self.doEvent_({"type": "trigger-contextmenu"}, el);
				}

				menu = el.parents(".context-menu_");

				// purge adjacent siblings
				menu.next(".context-menu_").remove();
				menu.find(".menu-item-down_").removeClass("menu-item-down_");

				// correct menu state
				parentEl = menu.attr("data-menu_parent");
				if (parentEl) {
					self.root_.find(".menu-item_[_id='"+ parentEl +"']").addClass("menu-item-down_");
				}

				// get menu node
				xMenuItem = manager.ledger_.selectSingleNode('//Menu[@_id="'+ el.attr('_id') +'"]');

				if (el.hasClass("menu-item-hasSub_")) {
					invoke = xMenuItem.getAttribute("invoke");
					thisDim = el[0].getBoundingClientRect();
					ownerDim = menu[0].getBoundingClientRect();

					if (invoke) {
						xPath = '//*[@for="'+ invoke +'"]';
						if (self.org_.win_.length) xPath = '//application[@id="'+ self.org_.winId_ +'"]'+ xPath;
					} else xPath = '//*[@_id="'+ el.attr("_id") +'"]';
					
					// render menu
					menu = manager.render_({
							template : "_menu",
							match : xPath,
							append : self.root_
						});

					// prepare for correct menu state
					menu.attr({"data-menu_parent": el.attr("_id")});

					// prepare dimensions for rendered menu
					height = menu.prop("offsetHeight");
					width = menu.prop("offsetWidth");
					top = thisDim.top - 3;
					left = parseInt(ownerDim.left + ownerDim.width, 10);

					// constaints
					if (left + width > window.innerWidth) left = ownerDim.left - width;
					if (top + height + 11 > window.innerHeight) top -= height - thisDim.height - 7;
					// position rendered menu
					menu.css({
						"top": top +"px",
						"left": left +"px"
					});
				}
				break;
			case "mousedown":
				if (event.target.type === "range") return;
				
				// prevent default behaviour
				event.preventDefault();

				// clear contextmenu if clicked on a non-menu-item
				if (el[0] === self.root_[0]) {
					return self.doEvent_({type: "clear-contextmenu"});
				}
				
				// purge contextmenu view
				self.doEvent_({type: "clear-contextmenu"});

				if (el.hasClass("hot-menu_") || el.hasClass("menu-item-disabled_")) return;

				// get menu node
				if (el.hasClass("color-select_")) {
					xMenuItem = manager.ledger_.selectSingleNode(`//Menu[@_id="${el.parent().attr('_id')}"]`);
					data.arg = el.attr("data-arg");
				} else {
					xMenuItem = manager.ledger_.selectSingleNode(`//Menu[@_id="${el.attr('_id')}"]`);
				}

				// check group logic
				cGroup = xMenuItem.getAttribute("check-group");
				if (cGroup) {
					cSiblings = manager.ledger_.selectNodes(`//*[@check-group="${cGroup}"]`);
					if (cSiblings.length > 1) {
						cSiblings.map(sibling => sibling.removeAttribute("is-checked"));
						xMenuItem.setAttribute("is-checked", "1");

						xFor = xMenuItem.parentNode.getAttribute("for");
						name = xMenuItem.getAttribute("name");
						if (xFor) {
							$(`.toolbar-selectbox_[data-menu="${xFor}"] .selectbox-selected_`).html(name);
						}
					} else {
						if (xMenuItem.getAttribute("is-checked") === "1") {
							xMenuItem.removeAttribute("is-checked");
							data.checked = -1;
						} else {
							xMenuItem.setAttribute("is-checked", 1);
							data.checked = 1;
						}
					}
				}
				// change selected if origin is selectbox
				el = self.org_.el_;
				if (el && el.hasClass("toolbar-selectbox_")) {
					el.find(".selectbox-selected_").html(xMenuItem.getAttribute("name"));
				}

				// find out app
				winId = manager.ledger_.selectSingleNode(`//Application[.//*/@_id="${xMenuItem.getAttribute("_id")}"]//meta[@name="id"]`);
				winId = winId ? winId.getAttribute("value") : self.org_.winId_;

				// get item arguments
				data.arg = data.arg || xMenuItem.getAttribute("arg");
				if (!data.arg) delete data.arg;

				// execute shell command, if any
				action = xMenuItem.getAttribute("shell");
				if (action) {
					if (data.arg) action += " "+ data.arg;
					return defiant_.shell_.execute_(action, winId);
				}

				action = xMenuItem.getAttribute("click");
				if (!action) return;

				// pass along original event element (and xmenu)
				data.type = action;
				//data.xMenu = xMenuItem;

				// forward command to application
				entity = defiant_.workSpace_.getEntity_(winId);

				if (entity && entity.app && typeof entity.app.dispatch === "function") {
					let res = entity.app.dispatch(data);
					if (res && typeof res.then === "function") {
						res.then(function(toggle) {
							if (!xMenuItem.getAttribute("toggle_true") && !xMenuItem.getAttribute("toggle_false")) return;
							let name, bName;
							switch (toggle) {
								case "toggle_true":
									name = xMenuItem.getAttribute("name");
									bName = xMenuItem.getAttribute("toggle_true");
									if (bName) xMenuItem.setAttribute("name", bName);
									xMenuItem.setAttribute("toggle_false", name);
									xMenuItem.removeAttribute("toggle_true");
									break;
								case "toggle_false":
									name = xMenuItem.getAttribute("name");
									bName = xMenuItem.getAttribute("toggle_false");
									if (bName) xMenuItem.setAttribute("name", bName);
									xMenuItem.setAttribute("toggle_true", name);
									xMenuItem.removeAttribute("toggle_false");
									break;
							}
						});
					}
				}
				break;
			case "contextmenu":
				// prevent default behaviour
				event.preventDefault();
				event.stopPropagation();

				// save info about original event
				self.org_.el_ = el.addClass("ctx-active");
				self.org_.win_ = el.hasClass("ant-window_") ? el : self.org_.el_.parents(".ant-window_");
				self.org_.winId_ = self.org_.win_.attr("data-id");

				ctx = this.getAttribute("data-context");
				xPath = '//Menu[@for="'+ ctx +'"]';
				if (self.org_.win_.length) {
					xPath = '//Application[.//meta/@name="id" and .//meta/@value="'+ self.org_.winId_ +'"]'+ xPath;
				}

				// notify / trigger associated contextual event for element
				entity = defiant_.workSpace_.getEntity_(self.org_.winId_);
				if (entity && entity.app && typeof entity.app.dispatch === "function") {
					el = $(event.target).parents("[data-click");
					if (el.length) {
						entity.app.dispatch(defiant_.window_.createEvent_(el, event, "data-click"));
					}
				}

				// render target menu
				menu = manager.render_({
					template : "_menu",
					match : xPath,
					target : self.root_
				});

				// stop if no menu has been generated
				if (!menu.length) return;

				// turn on the cover
				self.root_.addClass("menus-cover_");

				// prepare dimensions for rendered menu
				height = menu.prop("offsetHeight");
				width = menu.prop("offsetWidth");
				top = event.clientY;
				left = event.clientX;
				
				// constaints
				if (top + height + 11 > window.innerHeight) top -= height;
				if (left + width > window.innerWidth) left -= (width - 6);
				// position rendered menu
				menu.css({
					"top": top +"px",
					"left": left +"px"
				});
				break;
			// custom events
			case "trigger-contextmenu":
				// save info about original event
				self.org_.el_ = arguments[1].addClass("toolbar-active_ menubar-active_");
				self.org_.win_ = el.hasClass("ant-window_") ? el : self.org_.el_.parents(".ant-window_");
				self.org_.winId_ = self.org_.win_.attr("data-id");

				isMenuBar = self.org_.el_.parents(".menu-bar_").length > 0;
				if (isMenuBar) {
					self.root_.addClass("menubar-zoned_");
				}

				ctx = self.org_.el_.attr("data-menu");
				xPath = '//Menu[@for="'+ ctx +'" or @_id="'+ ctx +'"]';
				if (self.org_.win_.length) {
					xPath = '//Application[.//meta/@name="id" and .//meta/@value="'+ self.org_.winId_ +'"]'+ xPath; 
				}

				xMenuItem = manager.ledger_.selectSingleNode(xPath);
				// execute shell command, if any
				action = xMenuItem.getAttribute("shell");
				if (action) {
					self.org_.el_.removeClass("toolbar-active_ menubar-active_");
					return defiant_.shell_.execute_(action, self.org_.winId_);
				}

				// notify / trigger associated contextual event for element
				entity = defiant_.workSpace_.getEntity_(self.org_.winId_);
				if (entity && entity.app && typeof entity.app.dispatch === "function") {
					data = {
						type : "menu_on-"+ ctx,
						xMenu : manager.ledger_.selectSingleNode(xPath)
					};
					entity.app.dispatch(data, self.org_.el_, event);
				}

				// render target menu
				menu = manager.render_({
					template : "_menu",
					match : xPath,
					target : self.root_.addClass("menus-cover_")
				});

				// prepare dimensions for rendered menu
				thisDim = self.org_.el_[0].getBoundingClientRect();
				height = menu.prop("offsetHeight");
				width = menu.prop("offsetWidth");
				top = thisDim.top + thisDim.height + (isMenuBar ? 0 : 2);
				left = thisDim.left + 1;

				// constaints
				if (top + height + 11 > window.innerHeight) top -= height;
				if (left + width > window.innerWidth) left -= (width - thisDim.width + 2);

				// position rendered menu
				menu.css({
					"top": top +"px",
					"left": left +"px"
				});

				if (isMenuBar) self.addHotzones_();
				break;
			case "clear-contextmenu":
				el = self.org_.el_;
				if (el) {
					if (el.hasClass("menubar-menu_") || el.hasClass("toolbar-selectbox_") || el.attr("data-menu")) {
						el.removeClass("toolbar-active_ menubar-active_");
					}
					el.removeClass("ctx-active");
				}
				self.root_.removeClass("menus-cover_ menubar-zoned_").html("");
				break;
		}
	},
	updateItem_(app, what, params) {
		let xPath = `//Menu[@${what}]`,
			ledger,
			xMenu;
		if (app) xPath = `//Application[.//meta/@name="id" and .//meta/@value="${app}"]${xPath}`;

		ledger = defiant_.manager_.ledger_;
		xMenu = ledger.selectSingleNode(xPath);
		if (!xMenu) return;
		
		for (let key in params) {
			if (key === "is-checked") {
				let xGroup = xMenu.getAttribute("check-group"),
					xSiblings = ledger.selectNodes(`//*[@check-group="${xGroup}"]`),
					xFor,
					name;
				xSiblings.map(sibling => sibling.removeAttribute("is-checked"));

				xFor = xMenu.parentNode.getAttribute("for");
				if (xFor) {
					name = xMenu.getAttribute("name");
					$(`.toolbar-selectbox_[data-menu="${xFor}"] .selectbox-selected_`).html(name);
				}
			}
			xMenu.setAttribute(key, params[key]);
		}
	},
	addHotzones_() {
		let siblings = this.org_.el_.parent().find('.menubar-menu_[data-menu]'),
			hotZones = [];

		siblings.map(item => {
			let menuId = item.getAttribute('data-menu'),
				rect = item.getBoundingClientRect();

			//console.log(rect);
			hotZones.push(`<div class="hot-menu_" data-hotMenu="${menuId}" style="top: ${rect.top}px; left: ${rect.left}px; width: ${rect.width}px; height: ${rect.height}px;"></div>`);
		});

		this.root_.append(hotZones.join(""));
	}
}
,
		dock_: 
// defiant_.dock_

{
	map_: {
		bottom: "dock-bottom_",
		right: "dock-right_",
		left: "dock-left_",
	},
	init_() {
		// fast references
		this.doc_ = $(document);
		this.el_ = this.doc_.find(".dock-wrapper_").attr({"data-context": "dock"});
		
		// subscribe to events
		defiant_.on_("fs.loaded", this.doEvent_);
		defiant_.on_("window.opened", this.doEvent_);
		defiant_.on_("window.closed", this.doEvent_);

		// bind event handlers
		this.el_.on("click", ".dock-icon_", this.doEvent_);
	},
	doEvent_(event) {
		let self = defiant_.dock_,
			manager = defiant_.manager_,
			name,
			xNode,
			cmd,
			now,
			el;
		switch (event.type) {
			// native events
			case "click":
				el = $(this).addClass("dock-icon-active_");
				xNode = manager.ledger_.selectSingleNode(`//Dock/*[@did = "${el.attr("data-id")}"]`);
				cmd = xNode.getAttribute("shell");
				cmd = cmd || `win -o ${xNode.getAttribute("id")}`;
				defiant_.shell_.execute_(cmd);
				break;
			// sys events
			case "fs.loaded":
				now = Date.now();
				manager.ledger_.selectNodes("//Dock/*[not(@did)]").map((item, index) => {
					item.setAttribute("did", now + index);
				});

				// dock settings
				xNode = manager.ledger_.selectSingleNode("//Dock");
				if (xNode.getAttribute("hidden") === "true") return;

				// html of dock
				manager.render_({
					template: "_dock",
					match: "//Dock",
					target: self.el_.addClass(self.map_[xNode.getAttribute("position")])
				});
				break;
			case "window.opened":
				name = event.detail;
				xNode = manager.ledger_.selectSingleNode(`//Dock/*[@id = "${name}"]`);
				if (xNode) {
					self.el_.find(`div[data-id="${xNode.getAttribute("did")}"]`)
						.addClass("dock-icon-active_");
				}
				break;
			case "window.closed":
				name = event.detail;
				xNode = manager.ledger_.selectSingleNode(`//Dock/*[@id = "${name}"]`);
				if (xNode && name !== "finder") {
					self.el_.find(`div[data-id="${xNode.getAttribute("did")}"]`)
						.removeClass("dock-icon-active_");
				}
				break;
		}
	},
	position_(pos) {
		if (!~["left", "bottom", "right"].indexOf(pos)) {
			return {error: "invalid position"};
		}
		this.el_.removeClass(`${this.map_.bottom} ${this.map_.right} ${this.map_.left}`).addClass(this.map_[pos]);
	}
}

,
		shell_: 
// defiant_.shell_

{
	init_() {
		//let tmp = this.parseCommand_(`copy -r /temp/my\\ folder ~/banana\\ tree\\ folder`);
		//let tmp = this.parseCommand_(`copy -r "/temp/my folder" "~/banana tree folder"`);
		// let tmp = this.parseCommand_(`sys -p "ls a"`);
		// console.log(tmp);
		// setTimeout(async () => {
		// 	let tmp = await this.execute_(`sys -p 'ls a'`);
		// 	console.log(tmp.result);
		// }, 500);
	},
	parseCommand_(command, context) {
		command = command.replace(/\s/g, " ")
			.replace(/['"].+?['"]/g, (m) => {
				m = m.replace(/ /g, "\\ ");
				if (m.startsWith(`"`) || m.startsWith(`'`)) m = m.slice(1);
				if (m.endsWith(`"`) || m.endsWith(`'`)) m = m.slice(0, -1);
				return m;
			});

		let combo = [],
			parts = command.split(" ").reduce((acc, curr, index, arr) => {
				switch (true) {
					case curr.slice(-1) === "\\":
						combo.push(curr.slice(0, -1));
						break;
					default:
						if (combo.length) {
							combo.push(curr);
							acc.push(combo.join(" "));
							combo = [];
						} else {
							acc.push(curr);
						}
				}
				return acc;
			}, []);

		let ret = {
				cmd: parts.shift(),
				switch: parts.length && parts[0].slice(0, 1) === "-" ? parts.shift().slice(1) : false,
				arg: parts.map(a => a.startsWith("~/") ? `/app/ant/${context}${a.slice(1)}` : a)
			};

		return ret;
	},
	async execute_(command, context) {
		let ledger = defiant_.manager_.ledger_,
			pipe = command.split("|"),
			fn = defiant_,
			piped, cmd, param, arg,
			xCmd, fnPath, fnParent,
			xPath, appName, error, result;
			
		// remember caller context
		defiant_.shell_.context = context;

		while (pipe.length && !error) {
			piped = this.parseCommand_(pipe.shift().trim(), context);
			fn = defiant_;
			if (!piped.cmd) {
				error = `Command not found: ${command}`;
				break;
			}

			// pass forward result from previous pipe
			if (result) piped.arg.unshift(result);

			// search for shell command in ledger
			xPath = `/ledger/Shell/*[@object="${piped.cmd}"]`;
			if (piped.switch) {
				xPath += `/*[@switch="${piped.switch.slice(0,1)}"]`;
				if (piped.switch.length > 1) piped.arg.unshift(piped.switch);
			}
			xCmd = ledger.selectSingleNode(xPath);
			
			if (!xCmd) {
				// second attempt to find command
				xPath = `/ledger/Shell//*[@alias = "${piped.cmd}"]`;
				xCmd = ledger.selectSingleNode(xPath);
			}

			if (xCmd) {
				// check if command belongs to app
				appName = xCmd.parentNode.getAttribute("ant:app");
				if (appName) {
					// redirect execution to entity app
					fn = defiant_.workSpace_.getEntity_(appName).app;
					fnPath = xCmd.getAttribute('name').split('.');
				} else {
					// prepare function path
					fnPath = xCmd.parentNode.getAttribute('path').split('.');
					fnPath = fnPath.concat(xCmd.getAttribute('name').split('.'));
					// remove 'defiant_' from function path
					fnPath.shift();
				}

				// proxy command and execute it
				while (fnPath.length) {
					fnParent = fn;
					fn = fn[fnPath.shift()];
				}

				result = false;
				switch (fn.constructor.name) {
					case "AsyncFunction":
						result = await fn.apply(fnParent, piped.arg);
						break;
					case "Function":
						result = fn.apply(fnParent, piped.arg);
						break;
					default:
						throw "error";
				}
				if (result && result.error) {
					error = result.error;
					break;
				}
			} else {
				try {
					result = Function(`"use strict";return (${piped})`)();
				} catch (err) {
					error = `Command not found: ${command}`;
				}
			}
		}

		// forget caller context
		delete defiant_.shell_.context;

		return {
			command,
			error,
			result
		};
	}
},
		window_: 
// defiant_.window_

{
	drag_: {},
	resize_: {},
	init_() {
		// fast references
		this.doc_ = $(document);
		this.body_ = $("body");
		this.cover_ = this.body_.find(".menus-wrapper_");

		// bind event handlers
		this.doc_.on("click dblclick", "[data-click], [data-dblclick]", this.doEvent_);
		this.doc_.on("mousedown", ".ant-window_, .ant-window_ > btn, .win-caption-title_", this.doEvent_);
	},
	createEvent_(el, event, type) {
		if (event.type === "contextmenu") {
			type = el.attr(type);
		}
		const customEvent = {
				el,
				type: type || el.attr("data-"+ event.type),
				target: event.target,
				button: event.button,
				ctrlKey: event.ctrlKey,
				metaKey: event.metaKey,
				clientX: event.clientX,
				clientY: event.clientY,
			};
		if (el.attr("data-arg")) {
			customEvent.arg = el.attr("data-arg");
		}
		return customEvent;
	},
	doEvent_(event) {
		let root = defiant_,
			self = root.window_,
			drag = self.drag_,
			resize = self.resize_,
			min = Math.min,
			max = Math.max,
			entity,
			res,
			el,
			pEl,
			win,
			body,
			app,
			target,
			rect,
			type,
			top, left, width, height,
			bodyRect_,
			menubarHeight,
			dockHeight,
			statusBar,
			statusBarHeight;

		switch(event.type) {
			// case "focus":
			// 	defiant_.workSpace_.focus_(event.win);
			// 	break;
			case "dblclick":
			case "click":
				el = $(this);
				target = $(event.target);
				if (el.hasClass("win-disabled_") || target.hasClass("win-resizing_") || target.nodeName() === "body") return false;
				
				win = target.hasClass("ant-window_") ? target : target.parents(".ant-window_");
				if (!win.length && target.nodeName() !== "body") {
					return root.workSpace_.blurActive_();
				}

				win = target.hasClass("ant-window_") ? target : target.parents(".ant-window_");
				const { app } = root.workSpace_.getEntity_(win.attr("data-id"));

				if (app && typeof app.dispatch === "function") {
					// prevent default behaviour
					event.stopPropagation();
					res = app.dispatch(self.createEvent_(el, event));
					if (res && typeof res.then === "function") {
						res.then((result) => {
							let type = el.attr("data-"+ event.type),
								xPath = `//Application[.//@name="id"][.//@value="${win.attr("data-id")}"]//Menu[@click="${type}"]`,
								xMenuItem = defiant_.manager_.ledger_.selectSingleNode(xPath);
							if (xMenuItem && xMenuItem.getAttribute("is-checked")) {
								xMenuItem.setAttribute("is-checked", result ? "1" : "0");
							}
							if (el.hasClass("toolbar-tool_ ")) {
								el.toggleClass("toolbar-active_", result);
							}
						});
					}
				}
				break;
			case "mousedown":
				target = $(event.target);
				win = target.hasClass("ant-window_") ? target : target.parents(".ant-window_");
				rect = win[0].getBoundingClientRect();
				menubarHeight = defiant_.menuBar_.el_.height();
				dockHeight = defiant_.dock_.el_.height();

				if (!target.parents(".win-body_").length && target.nodeName() !== "input") {
					// prevent default behaviour
					event.preventDefault();
				}

				if (target.hasClass("right-resize_") && self.isResizing_(event, "right")) {
					return self.blockResize_.init_(event, target, "right");
				}

				if (target.nodeName() === "btn") {
					if (target.hasClass("wincap-close_")) return self.close_(win, target);
					else if (target.hasClass("wincap-minimize_") && !target.hasClass("win-disabled_")) return self.minimize_(win, target);
					else if (target.hasClass("wincap-maximize_") && !target.hasClass("win-disabled_")) return self.maximize_(win, target);
					else if (target.hasClass("wincap-restore_") && !target.hasClass("win-disabled_")) return self.restore_(win, target);
				}
				if (target.parent().nodeName() === "options") {
					if (target.hasClass("antwin-focused_")) return;
					target.parent().find(".antwin-focused_").removeClass("antwin-focused_");
					target.addClass("antwin-focused_");
				}
				if (!win.hasClass("antwin-focused_") && event.button !== 2) {
					//return self.doEvent_({type: "focus", win});
					defiant_.workSpace_.focus_(win);
				}
				// drag info depending on clicked element
				switch (true) {
					case target.hasClass("win-resize_"):
						entity = defiant_.workSpace_.getEntity_(win.attr("data-id"));
						type = target.prop("className").split(" ")[1];
						body = win.find(".win-body_");
						statusBar = win.find(".win-status-bar_");
						statusBarHeight = statusBar.length ? statusBar.height() : 0;
						bodyRect_ = body[0].getBoundingClientRect();
						drag = {
							win,
							body,
							type,
							rect,
							bodyRect_,
							clickY_: event.clientY,
							clickX_: event.clientX,
							min_: {
								top_: menubarHeight,
								left_: 0,
								width_: entity.win.minWidth || 360,
								height_: entity.win.minHeight || 280
							},
							max_: {
								top_: 0,
								left_: 0,
								width_: window.innerWidth - rect.left - 2,
								height_: window.innerHeight - bodyRect_.top - statusBarHeight - dockHeight - 2 // todo: need to calculate statusbar
							}
						};

						switch (drag.type) {
							case "w-resize_":
								drag.max_.left_ = rect.left + bodyRect_.width - drag.min_.width_;
								drag.max_.width_ = rect.left + bodyRect_.width;
								break;
							case "n-resize_":
								drag.max_.height_ = rect.top + bodyRect_.height - menubarHeight;
								drag.max_.top_ = rect.top + bodyRect_.height - drag.min_.height_;
								break;
							case "sw-resize_":
								drag.max_.left_ = rect.left + bodyRect_.width - drag.min_.width_;
								drag.max_.width_ = rect.left + bodyRect_.width;
								break;
							case "ne-resize_":
								drag.max_.top_ = rect.top + bodyRect_.height - drag.min_.height_;
								drag.max_.height_ = rect.top + bodyRect_.height - menubarHeight;
								break;
							case "nw-resize_":
								drag.max_.top_ = rect.top + bodyRect_.height - drag.min_.height_;
								drag.max_.left_ = rect.left + bodyRect_.width - drag.min_.width_;
								drag.max_.width_ = rect.left + bodyRect_.width;
								drag.max_.height_ = rect.top + bodyRect_.height - menubarHeight;
								break;
						}
						break;
					//case target.hasClass("header"):
					case target.hasClass("win-toolbar_"):
					case target.hasClass("win-caption-title_"):
					case target.hasClass("caption-title-span_"):
						// store data about event
						drag = {
							win,
							rect,
							type: "move",
							clickY_: event.clientY - rect.top,
							clickX_: event.clientX - rect.left,
							min_: {
								top_: menubarHeight,
								left_: event.clientX - rect.width - rect.left
							},
							max_: {
								top_: window.innerHeight + rect.top - event.clientY,
								left_: window.innerWidth + rect.left - event.clientX
							}
						};
						break;
					default:
						drag = false;
				}
				if (drag) {
					self.drag_ = drag;
					// cover UI to prevent unintentional mouseover
					self.cover_.addClass("menus-cover_");
					// bind event handlers for mousemove and mouseup
					self.doc_.bind("mousemove mouseup", self.doEvent_);
				}
				break;
			case "mousemove":
				// math depending on drag type
				switch (drag.type) {
					case "n-resize_":
						top = min(max(event.clientY - drag.clickY_ + drag.rect.top, drag.min_.top_), drag.max_.top_);
						height = max(min(drag.bodyRect_.height + drag.clickY_ - event.clientY, drag.max_.height_), drag.min_.height_);

						drag.win.css({top: top +"px"});
						drag.body.css({height: height +"px"});
						break;
					case "e-resize_":
						width = min(max(event.clientX - drag.clickX_ + drag.bodyRect_.width, drag.min_.width_), drag.max_.width_);
						drag.body.css({width: width +"px"});
						break;
					case "s-resize_":
						height = min(max(event.clientY - drag.clickY_ + drag.bodyRect_.height, drag.min_.height_), drag.max_.height_);
						drag.body.css({height: height +"px"});
						break;
					case "w-resize_":
						left = min(max(event.clientX - drag.clickX_ + drag.rect.left, drag.min_.left_), drag.max_.left_);
						width = max(min(drag.bodyRect_.width + drag.clickX_ - event.clientX, drag.max_.width_), drag.min_.width_);

						drag.win.css({left: left +"px"});
						drag.body.css({width: width +"px"});
						break;
					case "se-resize_":
						width = min(max(event.clientX - drag.clickX_ + drag.bodyRect_.width, drag.min_.width_), drag.max_.width_);
						height = min(max(event.clientY - drag.clickY_ + drag.bodyRect_.height, drag.min_.height_), drag.max_.height_);
						drag.body.css({
							width: width +"px",
							height: height +"px"
						});
						break;
					case "sw-resize_":
						left = min(max(event.clientX - drag.clickX_ + drag.rect.left, drag.min_.left_), drag.max_.left_);
						width = max(min(drag.bodyRect_.width + drag.clickX_ - event.clientX, drag.max_.width_), drag.min_.width_);
						height = min(max(event.clientY - drag.clickY_ + drag.bodyRect_.height, drag.min_.height_), drag.max_.height_);

						drag.win.css({left: left +"px"});
						drag.body.css({
							width: width +"px",
							height: height +"px"
						});
						break;
					case "ne-resize_":
						top = min(max(event.clientY - drag.clickY_ + drag.rect.top, drag.min_.top_), drag.max_.top_);
						width = min(max(event.clientX - drag.clickX_ + drag.bodyRect_.width, drag.min_.width_), drag.max_.width_);
						height = max(min(drag.bodyRect_.height + drag.clickY_ - event.clientY, drag.max_.height_), drag.min_.height_);

						drag.win.css({top: top +"px"});
						drag.body.css({
							width: width +"px",
							height: height +"px"
						});
						break;
					case "nw-resize_":
						top = min(max(event.clientY - drag.clickY_ + drag.rect.top, drag.min_.top_), drag.max_.top_);
						left = min(max(event.clientX - drag.clickX_ + drag.rect.left, drag.min_.left_), drag.max_.left_);
						width = max(min(drag.bodyRect_.width + drag.clickX_ - event.clientX, drag.max_.width_), drag.min_.width_);
						height = max(min(drag.bodyRect_.height + drag.clickY_ - event.clientY, drag.max_.height_), drag.min_.height_);

						drag.win.css({
							top: top +"px",
							left: left +"px"
						});
						drag.body.css({
							width: width +"px",
							height: height +"px"
						});
						break;
					case "move":
						top = min(max(event.clientY - drag.clickY_, drag.min_.top_), drag.max_.top_);
						left = min(max(event.clientX - drag.clickX_, drag.min_.left_), drag.max_.left_);
						// UI update
						self.drag_.win.css({
							top: top +"px",
							left: left +"px"
						});
						break;
				}
				break;
			case "mouseup":
				defiant_.emit_("GUI.Update."+ drag.win.attr("data-id"));
				// remove cover
				self.cover_.removeClass("menus-cover_");
				// remove event handlers
				self.doc_.unbind("mousemove mouseup", self.doEvent_);
				break;
			// this events are only activated on app-fullscreen
			case "mouseover":
				if (!self.body_.hasClass("top-hover_") && !self.hoverTime_) {
					self.body_.addClass("top-hover_");
					self.hoverTime_ = Date.now();
				}
				break;
			case "mouseout":
				pEl = $(event.toElement);
				if (!pEl.hasClass("menu-bar_") && !pEl.hasClass("win-caption-bar_")) {
					pEl = pEl.parents(".menu-bar_, .win-caption-bar_");
				}
				if (!pEl.length && self.hoverTime_ && Date.now() - self.hoverTime_ > 200) {
					setTimeout(() => self.body_.removeClass("top-hover_"), 100);
					delete self.hoverTime_;
				}
				break;
		}
	},
	isResizing_(event, dir) {
		let target = event.target,
			elRect = target.getBoundingClientRect(),
			afterStyle = window.getComputedStyle(event.target, ":after"),
			afterRect = {};

		afterRect.top = parseInt(afterStyle.getPropertyValue("top"), 10);
		afterRect.left = parseInt(afterStyle.getPropertyValue("left"), 10);
		afterRect.width = parseInt(afterStyle.getPropertyValue("width"), 10);
		afterRect.height = parseInt(afterStyle.getPropertyValue("height"), 10);
		//afterRect.cursor = afterStyle.getPropertyValue("cursor");

		switch (dir) {
			case "right":
				return event.offsetX >= afterRect.left && event.offsetX <= (afterRect.left + afterRect.width);
			case "bottom":
				return event.offsetY >= afterRect.top && event.offsetY <= (afterRect.top + afterRect.height);
		}
	},
	blockResize_: {
		drag_: {},
		init_(event, target, type) {
			this.doc_ = defiant_.window_.doc_;
			this.cover_ = defiant_.window_.cover_.addClass("menus-cover_");

			this.drag_ = {
				type,
				el: target.addClass("win-resizing_"),
				rect: target[0].getBoundingClientRect(),
				clickY_: event.clientY,
				clickX_: event.clientX,
				min: {
					width: 170,
				},
				max: {
					width: 340,
				}
			};
			// prevent default behaviour
			event.preventDefault();
			// bind event handlers for mousemove and mouseup
			this.doc_.bind("mousemove mouseup", this.doEvent_);
		},
		doEvent_(event) {
			let self = defiant_.window_.blockResize_,
				drag = self.drag_,
				top, left, width, height;

			switch (event.type) {
				case "mousemove":
					switch (drag.type) {
						case "right":
							width = Math.min(Math.max(event.clientX - drag.clickX_ + drag.rect.width, drag.min_.width_), drag.max_.width_);
							drag.el.css({width: width +"px"});
							break;
						case "left":
							break;
					}
					break;
				case "mouseup":
					setTimeout(() => drag.el.removeClass("win-resizing_"));
					
					// remove cover
					self.cover_.removeClass("menus-cover_");

					// remove event handlers
					self.doc_.unbind("mousemove mouseup", self.doEvent_);
					break;
			}
		}
	},
	updateTitle_(id, params) {
		const { win, app } = defiant_.workSpace_.getEntity_(id);
		if (params) {
			for (let key in params) {
				switch (key) {
					case "name":
						win.el.find(".win-caption-title_ .caption-title-span_:nth(0)").html(params[key]);
						break;
					case "isDirty":
						win.el.find(".win-caption-title_ .caption-title-span_.wincap-is-dirty_").toggleClass("wincap-dirty-show_", !params[key]);
						break;
				}
			}
		}
	},
	updateState_(state, item) {
		item = item || defiant_.shell_.context;
		switch (state) {
			case "max": this.maximize_(item); break;
			case "min": this.minimize_(item); break;
			case "restore": this.restore_(item); break;
		}
	},
	open_(name) {
		// open application
		defiant_.manager_.load_(name);
	},
	close_(item, button) {
		item = item || defiant_.shell_.context;
		const id = (typeof item === "string") ? item : item.attr("data-id");
		const { win, app } = defiant_.workSpace_.getEntity_(id);
		let animSpeed = 0;
		let dispatch;
		
		if (app && typeof(app.dispatch) === "function") {
			dispatch = app.dispatch({type: "window.close"});
			if (dispatch === false) return;
		}
		if (id !== "login") {
			win.el.addClass("antwin-closing_");
			animSpeed = 200;
		}
		// flushes event handlers
		$.flush(win, app);

		// remove event listeners app might subscribing to
		defiant_.clearApp_(id);

		setTimeout(() => {
			// delete reference to app
			defiant_.manager_.unload_(id);
		}, animSpeed);
	},
	async restore_(item, button) {
		item = item || defiant_.shell_.context;
		let id = (typeof item === "string") ? item : item.attr("data-id"),
			{ win, app } = defiant_.workSpace_.getEntity_(id),
			winBody = win.el.find(".win-body_"),
			rect = app.state._rect,
			dispatch;

		// delete trace of temp-variable
		delete app.state._rect;

		// update button
		button = button || win.el.find(".win-caption-buttons_ btn.wincap-restore_");
		button.removeClass("wincap-restore_").addClass("wincap-maximize_");
		button.find("svg use").attr({"href": "#window-maximize"});
		
		if (app && typeof(app.dispatch) === "function") {
			dispatch = app.dispatch({type: "window.restore"});
			if (typeof dispatch.then === "function") dispatch = await dispatch;
			if (dispatch === false) return;
		}

		// remove event handlers
		this.doc_.off("mouseover mouseout", ".win-caption-bar_", this.doEvent_);

		// restore window
		this.body_.removeClass("neo-fullscreen_");

		win.el.removeClass("antwin-fullscreen_").css({
				"top": rect.top +"px",
				"left": rect.left +"px"
			});
		winBody.css({
				"width": rect.width +"px",
				"height": rect.height +"px"
			});
	},
	async maximize_(item, button) {
		item = item || defiant_.shell_.context;
		let id = (typeof item === "string") ? item : item.attr("data-id"),
			{ win, app } = defiant_.workSpace_.getEntity_(id),
			winBody = win.el.find(".win-body_"),
			bodyRect_ = winBody[0].getBoundingClientRect(),
			rect = win.el[0].getBoundingClientRect(),
			dispatch;

		// update button
		button = button || win.el.find(".win-caption-buttons_ btn.wincap-maximize_");
		button.removeClass("wincap-maximize_").addClass("wincap-restore_");
		button.find("svg use").attr({"href": "#window-restore"});

		app.state = app.state || {};
		// save dimentions of win
		app.state._rect = {
			top: rect.top,
			left: rect.left,
			width: bodyRect_.width,
			height: bodyRect_.height
		};
		
		if (app && typeof(app.dispatch) === "function") {
			dispatch = app.dispatch({type: "window.maximize"});
			if (typeof dispatch.then === "function") dispatch = await dispatch;
			if (dispatch === false) return;
		}

		// bind event handlers
		this.doc_.on("mouseover mouseout", ".win-caption-bar_", this.doEvent_);

		// maximize window
		this.body_.addClass("neo-fullscreen_");

		win.el.addClass("antwin-fullscreen_").css({
				"top": "",
				"left": ""
			});
		winBody.css({
				"width": "",
				"height": ""
			});
	},
	minimize_(item, button) {
		if (!item && !button) {
			const { win, app } = defiant_.workSpace_.getActive_();
			console.log(win.el);
		}
	},
	help_(item) {
		item = item || defiant_.shell_.context;
		let id = (typeof item === "string") ? item : item.attr("data-id"),
			{ win, app, bluePrint } = defiant_.workSpace_.getEntity_(id),
			xHelp = bluePrint.selectSingleNode("./Head/meta[@name = 'help']");
		if (!xHelp) return;

		defiant_.fileSystem_.openUrl_(`/app/${item}/${xHelp.getAttribute("value")}`);
	}
}
,
		desktop_: 
// defiant_.desktop_

{
	drag_: {},
	box_: {},
	init_() {
		// fast references
		this.doc_ = $(document);
		this.el_ = $("body > .neo-desktop_");
		this.lasso_ = this.doc_.find(".neo-lasso_");
		
		this.el_.attr({"data-path": "/fs/usr"});

		// subscribe to events
		defiant_.on_("fs.loaded", this.doEvent_);

		// bind event handlers
		this.el_.on("mousedown", this.doEvent_);

		// resetting lasso
		this.dispatchLasso_({type: "mouseup"});
	},
	async doEvent_(event) {
		let root = defiant_,
			self = root.desktop_,
			drag = self.drag_,
			rect,
			mHeight,
			diffY,
			diffX,
			selected,
			clone,
			result,
			path,
			xNode,
			file,
			fileName;
		switch(event.type) {
			case "fs.loaded":
				// settings: hide/show icons on desktop
				xNode = root.manager_.ledger_.selectSingleNode("//Settings/Desktop/Icons");
				self.el_.toggleClass("hidden", xNode.getAttribute("hidden") !== "true");

				// html of menubar
				root.manager_.render_({
					template: "_desktop",
					match: "//FileSystem/*[@name='usr']",
					target: self.el_
				});
				break;
			case "mousedown":
				if (event.button === 2) return;
				// prevent default behaviour
				event.preventDefault();

				file = $(event.target).parents(".neo-file_");
				if (!file.length) {
					self.el_.find(".file-active_").removeClass("file-active_");
					return self.dispatchLasso_(event);
				}

				// handles dblclick
				if (file.hasClass("file-active_") && Date.now() - self.clickedTime_ < 300) {
					fileName = file.attr("data-link") || file.find("> span:nth(1)").text();
					path = file.parent().attr("data-path") +"/"+ fileName;
					result = await root.shell_.execute_(`fs -o '${path}'`);
					return result;
				}
				self.clickedTime_ = Date.now();

				if (event.metaKey) file.addClass("file-active_");

				selected = self.el_.find(".file-active_");
				if (!selected.length || !file.hasClass("file-active_")) {
					selected.removeClass("file-active_");
					selected = file.addClass("file-active_");
				}

				clone = selected.clone(true);
				self.el_.append(clone).addClass("file-clone_");
				rect = file[0].getBoundingClientRect();

				selected = selected.map(el => {
					return {
						el_: $(el).addClass("file-dragged_"),
						rect_: el.getBoundingClientRect()
					}
				});

				// get menubar height
				mHeight = root.menuBar_.el_.height();

				drag = {
					selected,
					clickY_: event.clientY + mHeight,
					clickX_: event.clientX,
					min_: {
						top: mHeight,
						left: 0,
					},
					max_: {
						top: window.innerHeight - rect.height,
						left: window.innerWidth - rect.width,
					}
				};

				if (drag) {
					self.drag_ = drag;
					// bind event handlers for mousemove and mouseup
					self.doc_.bind("mousemove mouseup", self.doEvent_);
				}
				break;
			case "mousemove":
				diffY = event.clientY - drag.clickY_;
				diffX = event.clientX - drag.clickX_;
				drag.selected.map(item => {
					let top = Math.min(Math.max(diffY + item.rect_.top, drag.min_.top), drag.max_.top),
						left = Math.min(Math.max(diffX + item.rect_.left, drag.min_.left), drag.max_.left);

					// UI update
					item.el_.css({
						top: top +"px",
						left: left +"px"
					});
				});
				break;
			case "mouseup":
				self.el_.find(".file-clone_").remove();
				self.el_.find(".file-dragged_").removeClass("file-dragged_");
				// remove event handlers
				self.doc_.unbind("mousemove mouseup", self.doEvent_);
				break;
		}
	},
	dispatchLasso_(event) {
		let root = defiant_,
			self = root.desktop_,
			box = self.box_,
			top,
			left,
			width,
			height;
		switch(event.type) {
			case "mousedown":
				let files = self.el_.find(".neo-file_").map(file => {
					let rect = file.getBoundingClientRect();
					return {
						file: $(file),
						top: rect.top,
						left: rect.left,
						th: rect.top + rect.height,
						lw: rect.left + rect.width
					}
				});

				self.box_ = {
					files,
					clickY_: event.clientY,
					clickX_: event.clientX,
				};
				// bind event handlers for mousemove and mouseup
				self.doc_.bind("mousemove mouseup", self.dispatchLasso_);
				break;
			case "mousemove":
				top = box.clickY_;
				left = box.clickX_;
				height = event.clientY - box.clickY_;
				width = event.clientX - box.clickX_;

				if (width < 0) {
					left += width;
					width = box.clickX_ - event.clientX;
				}
				
				if (height < 0) {
					top += height;
					height = box.clickY_ - event.clientY;
				}

				box.files.map(item => {
					let isOn = top <= item.th && item.top <= top + height && 
								left <= item.lw && item.left <= left + width;
					item.file.toggleClass("file-active_", !isOn);
				});

				// UI update
				self.lasso_.css({
					top: top +"px",
					left: left +"px",
					width: width +"px",
					height: height +"px"
				});
				break;
			case "mouseup":
				self.lasso_.css({top: "-10px", left: "0px", width: "0px", height: "0px"});
				// bind event handlers for mousemove and mouseup
				self.doc_.unbind("mousemove mouseup", self.dispatchLasso_);
				break;
		}
	},
	toggleIcons_(state) {
		let xSetting = defiant_.manager_.ledger_.selectSingleNode("//Settings/Desktop/Icons");
		if (!arguments.length) state = xSetting.getAttribute("hidden") === "true";
		
		if (!state) xSetting.setAttribute("hidden", "true");
		else xSetting.removeAttribute("hidden");

		this.el_.toggleClass("hidden", state);
	},
	updateIconColor_(color) {
		console.log("Change Folder Icon Color: ", color);
	},
	selectAll_() {
		this.el_.find(".neo-file_").addClass("file-active_");
	}
},
		menuBar_: 
// defiant_.menuBar_

{
	init_() {
		// fast references
		this.el_ = $("body > .menu-bar_");

		// subscribe to events
		defiant_.on_("ledger.loaded", this.render_);
		defiant_.on_("window.focused", this.render_);
	},
	render_(event) {
		let self = defiant_.menuBar_,
			manager = defiant_.manager_,
			htm;

		switch (event.type) {
			case "ledger.loaded":
				// html of menubar
				manager.render_({
					template: "_menubar",
					match: "//MenuBar[@for='system']",
					target: self.el_
				});

				self.applicationMenu_ = self.el_.find(".menubar-group_:nth(0)");
				self.dateTimeIcon_ = self.el_.find("svg.menubar-icon-clock_");
				self.dateTimeMenu_ = self.el_.find(".menubar-date-time_ span");
				self.userMenu_ = self.el_.find(".menubar-username_");

				self.updateDateTime_();
				break;
			case "window.focused":
				if (!self.applicationMenu_) return;

				htm = manager.render_({
					template: "_menubar",
					match: `//Application[./Head/meta/@name="id" and ./Head/meta/@value="${event.detail}"]/Head/MenuBar`
				});
				
				self.applicationMenu_.find(".menubar-menu_:not(:first-child)").remove();
				self.applicationMenu_.append(htm);
				break;
		}
	},
	settings_(name, value) {
		let xSetting;
		switch (name) {
			case "clock":
				xSetting = defiant_.manager_.ledger_.selectSingleNode(`//Settings/GuiMenubar/*[@id="date-time"]`);
				xSetting.setAttribute("value", value);

				this.el_.find(".menubar-date-time_").toggleClass("analog", value !== "analog");
				break;
		}
	},
	updateDateTime_() {
		let now = moment(),
			seconds = (60 - now.date.getSeconds()) * 1000;
		this.dateTimeMenu_.html(now.format("ddd D MMM HH:mm"));

		let hours = 30 * (now.date.getHours() % 12) + now.date.getMinutes() / 2,
			minutes = 6 * now.date.getMinutes();
		this.dateTimeIcon_.attr("style", `--rotation-hour: ${hours}deg; --rotation-minutes: ${minutes}deg;`);

		setTimeout(this.updateDateTime_.bind(this), seconds);
	},
	updateVolume_(i) {
		console.log(i);
	},
	checkMenuBar_(blueprint) {
		let id = blueprint.selectSingleNode(".//Head/meta[@name='id']").getAttribute("value"),
			name = blueprint.selectSingleNode(".//Head/meta[@name='title']").getAttribute("value"),
			defaultMenubar;
		
		if (!blueprint.selectSingleNode(".//MenuBar")) {
			defaultMenubar = defiant_.manager_.ledger_.selectSingleNode("//ContextMenu/MenuBar[@for='menubar-application-default']").cloneNode(true);
			defaultMenubar = $.prettyPrint(defaultMenubar)
								.replace(/ for="menubar-application-default"/g, "")
								.replace(/ _id="c\d+"/g, "")
								.replace(/\{\{name\}\}/g, name)
								.replace(/\{\{id\}\}/g, id);

			defaultMenubar = $.xmlFromString(`<i>${defaultMenubar}</i>`);
			blueprint.selectSingleNode(".//Head").appendChild(defaultMenubar.documentElement.firstChild);
		}
		let resizeAble = blueprint.selectSingleNode(".//Head/meta[@name='resize']").getAttribute("value"),
			btnMin = blueprint.selectSingleNode(".//Head/meta[@name='minimize']").getAttribute("value"),
			btnMax = blueprint.selectSingleNode(".//Head/meta[@name='maximize']").getAttribute("value"),
			menuMinimize = blueprint.selectSingleNode(`.//MenuBar//*[@shell="win -s min"]`),
			menuMaximize = blueprint.selectSingleNode(`.//MenuBar//*[@shell="win -s max"]`);

		if (menuMinimize && (btnMin === "disabled" || resizeAble === "disabled")) {
			menuMinimize.setAttribute("disabled", "1");
		}
		if (menuMaximize && (btnMax === "disabled" || resizeAble === "disabled")) {
			menuMaximize.setAttribute("disabled", "1");
		}
	}
},
		workSpace_: 
// defiant_.workSpace_

{
	spaces_: [],
	activeSpace_: 0,
	switchTransition_: false,
	init_() {
		// subscribe to events
		defiant_.on_("fs.loaded", this.dispatch_);
		
		// fast references
		this.body_ = $("body");
		this.wsReel_ = $("body > .workspace-reel_").attr({"data-space": "ws1"});
		this.wsReel_.append(`<div class="workspace-wrapper_" data-id="ws-1"></div>`);

		this.wsReel_.find(".workspace-wrapper_").map((item) => {
			this.spaces_.push({
				root: $(item),
				active: false,
				windows: []
			});
		});
	},
	dispatch_(event) {
		let self = defiant_.workSpace_,
			manager = defiant_.manager_,
			el,
			wideWp;
		switch (event.type) {
			case "fs.loaded":
				self.getAllWs_("wallpaper").map((item, index) => {
					if (index > 0) {
						self.spaces_.push({
							root: self.wsReel_.append(`<div class="workspace-wrapper_" data-id="${item.name}"></div>`),
							active: false,
							windows: []
						});
					}
					if (index === 0 && item.wide) wideWp = item.value;
					else if (!wideWp) {
						self.wsReel_.find(`.workspace-wrapper_[data-id='${item.name}']`).attr({style: item.value});
					}
				});

				el = self.wsReel_.prepend(`<div class="wide-wallpaper_"></div>`);
				if (wideWp) {
					self.wsReel_.addClass("is-wide-wp_");
					el.attr({style: wideWp});
				}

				self.getAllWs_("app").map(item => {
					let app = item.id,
						workSpaceId = +item.name.split("-")[1] - 1;
					delete item.id;
					delete item.name;
					manager.load_(app, workSpaceId, item);
				});
				break;
		}
	},
	getAllWs_(type) {
		let result = defiant_.manager_.ledger_.selectNodes(`//Settings/Desktop/WorkSpace//*[@type='${type}']`).map(item => {
			let ret = {
					name: item.parentNode.getAttribute("name"),
					wide: item.getAttribute("wide")
				},
				len = item.attributes.length;
			if (item.textContent) ret.value = item.textContent;
			else {
				while (len--) {
					if (item.attributes[len].name === "type") continue;
					ret[item.attributes[len].name] = item.attributes[len].value;
				}
			}
			return ret;
		});
		return result;
	},
	wallpaper_(id, bg) {
		if (!id) id = this.activeSpace_ + 1;

		let ledger = defiant_.manager_.ledger_,
			cdata = ledger.ownerDocument.createCDATASection(bg),
			workspace = (id === "wide") ? this.wsReel_.find(".wide-wallpaper_") : this.spaces_[id-1].root,
			xSpace,
			el;

		if (!bg) {
			let oldBg = workspace.css("background")
						.replace(/ padding-box border-box/i, "")
						.replace(/"/g, "'")
						.replace(/rgba\(0, 0, 0, 0\) /i, "")
			return oldBg;
		}

		if (id === "wide") {
			id = 1;
			this.spaces_.map(space => space.root.removeAttr("style"));
			this.wsReel_.addClass("is-wide-wp_");
			
			workspace.after(`<div class="new-wp-bg_" style="${bg}"></div>`);
			xSpace = ledger.selectSingleNode(`//Settings/Desktop/WorkSpace/*[@name="ws-1"]/i[@type="wallpaper"]`);
			xSpace.setAttribute("wide", 1);
		} else {
			this.wsReel_.removeClass("is-wide-wp_");

			el = this.wsReel_.find(".wide-wallpaper_");
			if (el.attr("style")) {
				el.removeAttr("style");
				this.getAllWs_("wallpaper").map((item, index) => {
					if (index === id) return;
					this.spaces_[index].root.attr({"style": item.value});
				});
			}

			workspace.prepend(`<div class="new-wp-bg_" style="${bg}"></div>`);
			xSpace = ledger.selectSingleNode(`//Settings/Desktop/WorkSpace/*[@name="ws-${id}"]/i[@type="wallpaper"]`);
			xSpace.removeAttribute("wide");
		}

		setTimeout(() => workspace.attr({style: bg}), 280);
		setTimeout(() => this.wsReel_.find(".new-wp-bg_").remove(), 310);
		
		// save settings
		xSpace.removeChild(xSpace.firstChild);
		xSpace.appendChild(cdata);
	},
	switchTo_(i) {
		let index = i - 1,
			current = +this.wsReel_.attr("data-space").slice(-1) - 1,
			className = current < index ? "view-to-left_" : "view-to-right_";
		
		if (this.switchTransition_ || index === current) return;
		this.activeSpace_ = index;
		this.switchTransition_ = true;

		this.body_.addClass("workspace-switch_");
		this.wsReel_.addClass("switching-"+ i +"_");
		this.spaces_[current].root.addClass(className);
		this.spaces_[index].root.addClass("ws-into-view_");

		setTimeout(() => {
			this.body_.removeClass("workspace-switch_");
			this.wsReel_.attr({"data-space": "ws"+ i}).removeClass("switching-1_ switching-2_ switching-3_");
			this.wsReel_.find(".workspace-wrapper_").prop({"className": "workspace-wrapper_"});

			this.switchTransition_ = false;
		}, 1000);
	},
	getSpace_(index) {
		let spaceIndex = this.activeSpace_;
		if (index) {
			spaceIndex = typeof index === "number" ? index : +index.parent().attr("data-id").slice(-1) - 1;
		}
		return this.spaces_[spaceIndex];
	},
	getEntity_(id, space) {
		let activeSpace_ = space || this.getSpace_(),
			entityId = id || activeSpace_.active,
			focusEntity = activeSpace_.windows.find(item => item.win.el.attr("data-id") === entityId);

		if (!focusEntity) {
			// look for app in other workspaces
			this.spaces_.map((space, index) => {
				if (focusEntity || space === activeSpace_) return;
				focusEntity = space.windows.find(item => item.win.el.attr("data-id") === entityId);
			});
		}

		return focusEntity;
	},
	getActive_() {
		let activeEntity = this.getEntity_();
		if (!activeEntity) {
			activeEntity = {
				app: defiant_.desktop_,
				bluePrint: defiant_.manager_.ledger_.selectSingleNode("//ContextMenu")
			};
		}
		return activeEntity;
	},
	blurActive_() {
		let activeSpace_ = this.getSpace_(),
			blurEntity = this.getEntity_(activeSpace_.active);
		activeSpace_.active = false;

		if (blurEntity && blurEntity.app && typeof blurEntity.app.dispatch) {
			blurEntity.win.el.removeClass("antwin-focused_")
				.find(".win-body_").removeClass("focused");
			blurEntity.app.dispatch({type: "window.blur"});
		}
	},
	focus_(win) {
		if (typeof win === "string") win = this.getEntity_(win).win.el;
		let id = win.attr("data-id"),
			activeSpace_ = this.getSpace_(win),
			focusEntity = this.getEntity_(id, activeSpace_),
			blurEntity = this.getEntity_(activeSpace_.active),
			index = activeSpace_.windows.findIndex(item => item.win.el.attr("data-id") === id);

		activeSpace_.windows.splice(index, 1);
		activeSpace_.windows.splice(0, 0, focusEntity);
		activeSpace_.active = focusEntity.win.el.attr("data-id");
		
		activeSpace_.windows.map((item, index) => {
			if (index === 0) {
				item.win.el
					.attr({"data-zIndex": index + 1})
					.addClass("antwin-focused_").css({"z-index": 100 - index})
					.find(".win-body_").addClass("focused");
			} else {
				item.win.el
					.attr({"data-zIndex": index + 1})
					.removeClass("antwin-focused_").css({"z-index": 100 - index})
					.find(".win-body_").removeClass("focused");
			}
		});

		if (blurEntity && blurEntity.app && typeof blurEntity.app.dispatch) {
			blurEntity.app.dispatch({type: "window.blur"});
		}

		if (focusEntity.app && typeof focusEntity.app.dispatch) {
			focusEntity.app.dispatch({type: "window.focus"});
		}

		// emit event
		defiant_.emit_("window.focused", id);
	},
	remove_(id) {
		let activeSpace_ = this.getSpace_(),
			entity = this.getEntity_(id);

		// emit event
		defiant_.emit_("window.closed", id);

		// remove app imports
		this.body_.find(`script[app-id="${name}"]`).remove();
		entity.imports.map(item => delete window[item]);
		
		// remove app style
		this.body_.find(`style[data-id="${id}"]`).remove();
		entity.win.el.remove();
		
		delete entity.app;
		delete entity.blueprint;

		activeSpace_.windows = activeSpace_.windows.filter(item => item.win.el.attr("data-id") != id);

		if (activeSpace_.windows.length) {
			let activate = activeSpace_.windows[0].win.el.attr("data-id");
			this.focus_(activate);
		} else {
			// menubar unload menu?
			// or load finder menu
		}
	},
	append_(winHtm, index) {
		let activeSpace_ = this.getSpace_(index),
			win = activeSpace_.root.append(winHtm);

		activeSpace_.windows.unshift({win: {el: win}});
		this.focus_(win);
		//defiant_.window_.doEvent_({type: "focus", win});

		// emit event
		defiant_.emit_("window.opened", win.attr("data-id"));

		return activeSpace_.windows[0];
	}
},
		fileSystem_: 
// defiant_.fileSystem_

{
	init_() {
		// let tmp = this.path_.join_("~/Documents/hbi", "../Desktop");
		// console.log(tmp);

		// defiant_.on_("fs.loaded", () => {
		// 	console.log( this.path_.getName_("/doc") );
		// 	console.log( this.path_.getName_("/usr/banan.txt") );
		// 	console.log( this.path_.getName_("/usr/mp3/test.mp3") );
		// });
	},
	path_: {
		join_() {
			let path = [];
			[].slice.call(arguments).join("/").split("/").filter(i => i).map(item => {
				switch (item) {
					case ".": break;
					case "..": path.pop(); break;
					default: path.push(item);
				}
			});
			if (!path.length) path.push("~");
			return path.join("/");
		},
		opensWith_(path) {
			let kind = path.slice(path.lastIndexOf(".")+1),
				mime = defiant_.manager_.ledger_.selectSingleNode(`//Mime//*[@id="${kind}"]`);
			return mime ? mime.getAttribute("opens-with") || "textEdit" : "finder";
		},
		isDirectory_(path) {
			path = this.transform_(path);
			let xPath = this.toXpath_(path),
				xFolder = defiant_.manager_.ledger_.selectSingleNode(xPath);
			return xFolder && xFolder.getAttribute("kind") === "_dir";
		},
		exists_(path) {
			path = this.transform_(path);
			let xPath = this.toXpath_(path),
				xFolder = defiant_.manager_.ledger_.selectSingleNode(xPath);
			return xFolder !== null;
		},
		getName_(path) {
			let alias = defiant_.manager_.ledger_.selectSingleNode(`//FsAlias//*[@path="${path}"]`);
			return alias ? alias.getAttribute("value") : path.slice(path.lastIndexOf("/") + 1);
		},
		transform_(path) {
			if (path.slice(0, 1) === "~") path = path.slice(1);
			if (path.slice(0, 3) !== "/fs") path = "/fs"+ path;
			return path;
		},
		fromNode_(node) {
			let path = [];
			while (node.nodeName !== "FileSystem") {
				path.unshift(node.getAttribute("name"));
				node = node.parentNode;
			}
			return "/fs/"+ path.join("/");
		},
		toXpath_(path) {
			path = this.transform_(path);
			let xPath = [],
				folders = path.split("/");
	
			folders.map(name => {
				if (!name) return;
				if (name === "fs") {
					xPath.push("//FileSystem");
				} else {
					xPath.push(`/*[@name='${name}']`);
				}
			});
	
			return xPath.join("");
		},
	},
	translateDates_(xpath) {
		let nodes = defiant_.manager_.ledger_.selectNodes(xpath || "//FileSystem//*[not(@mTime)]");
		nodes.map(item => {
			let moment = new Moment(+item.getAttribute("mStamp"));
			item.setAttribute("mDate", moment.format("D MMM YYYY"));
			item.setAttribute("mTime", moment.format("HH:mm"));
			item.setAttribute("isodate", moment.format("YYYY-MM-DD HH:mm"));
		});
	},
	formatBytes_(bytes) {
		let k = 1024,
			sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"],
			i = Math.floor(Math.log(bytes) / Math.log(k));
		if (bytes === 0) return bytes +" "+ sizes[i];
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) +" "+ sizes[i];
	},
	diskInfo_(flags) {
		let xFileSystem = defiant_.manager_.ledger_.selectSingleNode("//FileSystem"),
			result = {
				quota: +xFileSystem.getAttribute("quota"),
				used: +xFileSystem.getAttribute("used"),
				avail: +xFileSystem.getAttribute("avail"),
			};
		if (flags && ~flags.indexOf("h")) {
			result.quota = this.formatBytes_(result.quota);
			result.used = this.formatBytes_(result.used);
			result.avail = this.formatBytes_(result.avail);
		}
		return result;
	},
	list_(path, flags) {
		path = this.path_.transform_(path);
		
		let xPath = this.path_.toXpath_(path),
			ledger = defiant_.manager_.ledger_,
			xFolder = ledger.selectSingleNode(xPath),
			result = xFolder.selectNodes("./*").map(xNode => {
				let name = xNode.getAttribute("name");
				if (xNode.parentNode.nodeName === "FileSystem") {
					let alias = ledger.selectSingleNode(`//FsAlias/*[@name="${name}"]`);
					name = alias ? alias.getAttribute("value") : name;
				}
				return {
					name,
					kind: xNode.getAttribute("kind"),
					mDate: xNode.getAttribute("mDate"),
					mTime: xNode.getAttribute("mTime"),
					size: this.formatBytes_(xNode.getAttribute("size")),
				}
			});
		return result;
	},
	async openUrl_(url) {
		let text = await $.fetch(url),
			kind = url.slice(url.lastIndexOf(".")+1),
			opensWith = this.path_.opensWith_(url),
			app = await defiant_.manager_.load_(opensWith);

		if (typeof app.dispatch === "function") {
			app.dispatch({
				text,
				path: url,
				type: "open.file",
			});
		}
	},
	async open_(file) {
		let self = this,
			path = this.path_.transform_("/"+ this.path_.join_(file)),
			name = path.slice(path.lastIndexOf("/")+1),
			kind = path.slice(path.lastIndexOf(".")).slice(1),
			opensWith = this.path_.opensWith_(path),
			entity,
			app,
			fileObj = {
				name,
				kind,
				path,
				type: "open.file",
				async open() {
					return await self.readFile_(path);
				}
			};
		// freeze file object
		Object.freeze(fileObj);

		// check if app is already open - otherwise, open it
		entity = defiant_.workSpace_.getEntity_(opensWith);

		// load app
		app = entity ? entity.app : await defiant_.manager_.load_(opensWith);
		if (typeof app.dispatch === "function") {
			app.dispatch(fileObj);
		}
	},
	async previewFile_(file) {
		// TODO: check file size and preview if small
		let data = await $.fetch(file);
		data = data.documentElement;

		return {
			name: data.getAttribute("name"),
			node: data,
			path: file,
			kind: data.getAttribute("kind"),
			size: this.formatBytes_(data.getAttribute("size")),
			text: atob(data.textContent),
		};
	},
	async readFile_(file) {
		file = this.path_.transform_(file);
		
		let xPath = this.path_.toXpath_(file),
			ledger = defiant_.manager_.ledger_,
			xParent = ledger.selectSingleNode(xPath),
			name,
			path,
			size,
			kind,
			text;
		
		if (!xParent) {
			// load to detached filesystem
			xParent = ledger.selectSingleNode("//dfs");
			let data = await $.fetch(file);

			if (data.reader) {
				path = file;
				name = file.slice(file.lastIndexOf("/")+1);
				kind = file.slice(file.lastIndexOf(".")).slice(1);
				size = data.size;
				text = data.reader;
				data = ledger.ownerDocument.createElement("item");
			} else {
				data = data.documentElement;
				name = data.getAttribute("name");
				path = data.getAttribute("path");
				kind = data.getAttribute("kind");
				size = data.getAttribute("size");
				text = atob(data.textContent);
			}

			return {
				name,
				text,
				path,
				kind,
				node: data,
				size: this.formatBytes_(size)
			};
		}

		if (!xParent.hasChildNodes()) {
			let data = await $.fetch(file);
			data = data.documentElement;

			if (data.getAttribute("kind") === "_dir") {
				while (data.hasChildNodes()) {
					xParent.appendChild(data.childNodes[0]);
				}
				data = xParent;
			}

			// fix modified dates
			this.translateDates_();

			return {
				name: data.getAttribute("name"),
				node: data,
				path: file,
				kind: data.getAttribute("kind"),
				size: this.formatBytes_(data.getAttribute("size")),
				text: atob(data.textContent),
			};
		}

		return {
			name: xParent.getAttribute("name"),
			node: xParent,
			path: file,
			kind: xParent.getAttribute("kind"),
			size: this.formatBytes_(xParent.getAttribute("size"))
		};
	},
	async writeFile_(file, data) {

	}
}
,
		localStorage_: 
// defiant.localStorage_

{
	init_() {
		this.storage_ = window.localStorage;
	},
	setItem_(key, value) {
		return this.storage_.setItem(key, value);
	},
	getItem_(key) {
		return this.storage_.getItem(key);
	},
	removeItem_(key) {
		return this.storage_.removeItem(key);
	},
	clear_() {
		return this.storage_.clear();
	}
},
		eventHandlers_: 
// defiant_.eventHandlers_

{
	drag_: {},
	init_() {
		// fast references
		this.doc_ = $(document);
		this.body_ = $("body");
		this.cover_ = this.body_.find(".menus-wrapper_");

		// bind events
		this.body_.on("click", "[sys-click]", this.doEvent_);
		this.body_.on("mousedown", "[data-ondrag], [data-dbl-click]", this.doEvent_);
	},
	async doEvent_(event) {
		let root = defiant_,
			self = root.eventHandlers_,
			drag = self.drag_,
			entity,
			dropZone,
			dragged_,
			fEvent,
			zones_,
			zoneId,
			win,
			pEl,
			el,
			top,
			left,
			pRect,
			rect,
			res;
		switch (event.type) {
			// native events
			case "click":
				el = $(event.target);
				self.doEvent_({
					el,
					pEl_: $(this),
					orgEvent_: event,
					type: this.getAttribute("sys-click"),
				});
				break;



			// System-wide drag-and-drop zone handlers
			case "mousedown":
				dragged_ = $(this);
				pEl = dragged_.parents("[data-drag-root]");
				win = pEl.parents(".ant-window_");

				if (dragged_.data("dbl-click")) {
					win = dragged_.parents(".ant-window_");
					entity = root.workSpace_.getEntity_(win.data("id"));

					// prevent default behaviour
					event.stopPropagation();

					// forward event
					fEvent = root.window_.createEvent_(dragged_, event, dragged_.data("dbl-click"));
					if (entity.app && typeof entity.app.dispatch === "function") {
						entity.app.dispatch(fEvent);
					}

					// dont continue; event was dblclick
					return;
				}

				// this identifies diff of dragstart and dbl-click
				if (self.clickedTime_ && Date.now() - self.clickedTime_ < 300) return delete self.clickedTime_;
				self.clickedTime_ = Date.now();
				//if (!dragged_.data("ondrag") && !win.length) return;


				const { app } = root.workSpace_.getEntity_(win.data("id"));
				if (app && typeof app.dispatch === "function") {
					// prevent default behaviour
					event.stopPropagation();

					fEvent = root.window_.createEvent_(dragged_, event, dragged_.data("ondrag"));
					res = app.dispatch(fEvent);
					if (res && typeof res.then === "function") res = await res;
					if (!res) return;
				} else {
					// todo; integrated to desktop icons
					return;
				}

				if (res.length) dragged_ = res;

				// UI of dragged element
				dragged_ = dragged_.map(el => {
					return {
						el_: $(el).addClass("drag-moving"),
						originTop_: el.offsetTop,
						originLeft_: el.offsetLeft,
						rect_: el.getBoundingClientRect()
					}
				});

				zones_ = pEl.find("[data-drop-zone]");
				rect = this.getBoundingClientRect();
				pRect = pEl[0].getBoundingClientRect();
				self.drag_ = {
					dragged_,
					zones_,
					dispatch_: app ? app.dispatch : false,
					clickY_: event.clientY,
					clickX_: event.clientX,
					min_: {},
					max_: {}
				};

				// calculate boundries
				self.drag_.min_.top_ = pRect.top + this.offsetTop - rect.top;
				self.drag_.min_.left_ = pRect.left + this.offsetLeft - rect.left;
				self.drag_.max_.top_ = self.drag_.min_.top_ + pRect.height - rect.height;
				self.drag_.max_.left_ = self.drag_.min_.left_ + pRect.width - rect.width;

				// assemble drop zones
				let str = [];

				str.push(`<div class="neo-dropzone-wrapper_" style="top: ${pRect.top}px; left: ${pRect.left}px; width: ${pRect.width}px; height: ${pRect.height}px;">`);
				zones_.map((el, index) => {
					let elRect = el.getBoundingClientRect(),
						top = elRect.top - pRect.top,
						left = elRect.left - pRect.left,
						width = elRect.width,
						height = elRect.height;
					str.push(`<div class="neo-dropzone_" data-zone-id="${index}" style="top: ${top}px; left: ${left}px; width: ${width}px; height: ${height}px;"></div>`);
				});
				str.push(`</div>`);

				// activate drag-cover
				self.cover_.addClass("drag-cover_").html(str.join(""));

				// bind event handlers for mousemove and mouseup
				self.doc_.bind("mouseover mousemove mouseup", self.doEvent_);
				break;
			

			case "mousemove":
				drag.dragged_.map(item => {
					let top = Math.min(Math.max(event.clientY - drag.clickY_ + item.originTop_, drag.min_.top_), drag.max_.top_),
						left = Math.min(Math.max(event.clientX - drag.clickX_ + item.originLeft_, drag.min_.left_), drag.max_.left_);

					// UI update
					item.el_.css({
						top: top +"px",
						left: left +"px"
					});
				});
				break;

			
			case "mouseup":
				// remove class from element: drag ended
				drag.dragged_.map(item => {
					item.el_.removeClass("drag-moving");
				});

				zoneId = event.target.getAttribute("data-zone-id");
				if (zoneId) {
					dropZone = drag.zones_.get(zoneId);
					fEvent = root.window_.createEvent_(drag.dragged_[0].el_, event, dropZone.data("drop-zone"));
					fEvent.el = $(drag.dragged_.map(item => item.el_[0]));
					fEvent.target = $(dropZone[0]);
					// prepare offset info
					pRect = drag.zones_[zoneId].getBoundingClientRect();
					fEvent.targetOffset = fEvent.el.map(item => {
						let rect = item.getBoundingClientRect();
						return {
							top: rect.top - pRect.top,
							left:  rect.left - pRect.left
						};
					});

					if (typeof drag.dispatch_ === "function") {
						res = drag.dispatch_(fEvent);
						if (res && typeof res.then === "function") res = await res;
					}
				}
				
				// reset drag-hover elements
				drag.zones_.removeClass("drag-hover");

				if (!res) {
					drag.dragged_.map(item => {
						if (parseInt(item.el_.css("top"), 10) === item.originTop_) {
							item.el_.removeClass("drag-return-to-origin").removeAttr("style");
						} else {
							item.el_
								.cssSequence("drag-return-to-origin", "transitionend", el => el.removeClass("drag-return-to-origin").removeAttr("style"))
								.css({
									top: item.originTop_ +"px",
									left: item.originLeft_ +"px"
								});
						}
					});
				}

				// remove drag-cover
				self.cover_.removeClass("drag-cover_").html("");

				// bind event handlers for mousemove and mouseup
				self.doc_.unbind("mouseover mousemove mouseup", self.doEvent_);
				break;
			case "mouseover":
				if (drag) {
					drag.zones_.removeClass("drag-hover");
				}
				zoneId = event.target.getAttribute("data-zone-id");
				if (zoneId) {
					drag.zones_.get(zoneId).addClass("drag-hover");
				}
				break;







			// custom events
			case "add-win-tab":
				// prevent bubbling up
				event.orgEvent_.stopPropagation();

				pEl = event.el.parents(".win-tabbar_");
				el = pEl.find(".tabbar-tab_").get(0).clone(true);
				el.removeClass("tabbar-prev-active_ tabbar-next-active_");
				el.find("span").html("New document");
				pEl.append(el).trigger("click");
				break;
			case "remove-win-tab":
				// prevent bubbling up
				event.orgEvent_.stopPropagation();

				pEl = event.el.parents(".win-tabbar_");
				if (pEl.find(".tabbar-tab_").length <= 2) {
					pEl.addClass("win-tabbar-hidden_");
				}
				// remove clicked tab
				event.el.parent().remove();
				if (!pEl.find(".tabbar-active_").length) {
					pEl.find(".tabbar-tab_").get(0).trigger("click");
				}
				break;
			case "do-win-tabs":
				el = event.el;
				if (!el.parent().hasClass("win-tabbar_")) return;
				event.pEl_.find(".tabbar-active_").removeClass("tabbar-active_");
				el.prevAll(".tabbar-tab_").removeClass("tabbar-next-active_").addClass("tabbar-prev-active_");
				el.nextAll(".tabbar-tab_").removeClass("tabbar-prev-active_").addClass("tabbar-next-active_");
				el.removeClass("tabbar-prev-active_ tabbar-next-active_").addClass("tabbar-active_");
				break;
			case "do-toolbar-options":
				el = event.el;
				if (el.hasClass("win-disabled_") || !event.pEl_.hasClass("toolbar-options_")) return;
				event.pEl_.find(".toolbar-active_").removeClass("toolbar-active_");
				el.addClass("toolbar-active_");
				break;
			case "do-tab-row":
				el = event.el;
				if (el.hasClass("tab-disabled_") || !el.parent().hasClass("tab-row_")) return;
				event.pEl_.find(".tab-row_ > .tab-active_, .tab-body_ > .tab-active_").removeClass("tab-active_");
				el.addClass("tab-active_");
				event.pEl_.find(`.tab-body_ > div:nth(${el.index()})`).addClass("tab-active_");
				break;
		}
	}
}
,
		spotlight_: 
// defiant_.spotlight_

{
	init_() {
		// fast references
		this.el_ = $("body > .spotlight-wrapper_");

		// subscribe to events
		defiant_.on_("fs.loaded", this.doEvent_);

		// event handlers
		this.el_.on("keydown keyup", "input", this.doEvent_);
	},
	doEvent_(event) {
		let self = defiant_.spotlight_,
			fs = defiant_.fileSystem_,
			manager = defiant_.manager_,
			ledger = manager.ledger_,
			active,
			len,
			id,
			index;
		
		switch (event.type) {
			case "fs.loaded":
				// fake event
				manager.render_({
					template: "_spotlight",
					match: "//Spotlight",
					target: self.el_
				});
				
				self.inputContent_ = self.el_.find(".spotlight-input-content_");
				self.opensWithIcon_ = self.el_.find(".opens-with-app-icon");

				/* temp 
				self.toggleSearch_();
				self.el_.find("input").val("d");
				self.el_.find("input").trigger("keyup");
				*/
				break;
			case "keydown":
				self.el_.removeClass("spotlight-no-matches_");
				
				switch (event.which) {
					case 13: // enter
						self.el_.removeClass("spotlight-show_ show-matches_");
						self.el_.find(".spotlight-input_ input").val("").blur();

						setTimeout(() => {
							let active = self.el_.find(".spotlight-list_ .spotlight-active_");
							defiant_.shell_.execute_(active.attr("data-shell"));
						}, 60);
						break;
					case 27: // esc
						if (self.el_.hasClass("show-matches_")) {
							self.el_.removeClass("show-matches_");
							self.el_.find(".spotlight-input_ input").val("");
						} else {
							self.el_.removeClass("spotlight-show_");
							self.el_.find(".spotlight-input_ input").blur();
						}
						break;
					case 38: // up
						// prevent default behaviour
						event.preventDefault();

						active = self.el_.find(".spotlight-list_ .spotlight-active_").removeClass("spotlight-active_");
						len = self.el_.find(".spotlight-list_ .spotlight-item_").length;
						if (len < 1) return;
						index = Math.max(0, active.prevAll(".spotlight-item_").length - 1);
						active = self.el_.find(".spotlight-list_ .spotlight-item_").get(index).addClass("spotlight-active_");
						
						// update opens-with-icon
						self.opensWithIcon_.css({"background-image": `url('/ant/icons/app-icon-${active.attr("data-opens-with")}.png')`});

						manager.render_({
							template: "_hit-details",
							match: `//Spotlight//*[@match-id = "${active.attr("data-id")}"]`,
							target: self.el_.find(".preview-wrapper_")
						});
						break;
					case 40: // down
						// prevent default behaviour
						event.preventDefault();

						active = self.el_.find(".spotlight-list_ .spotlight-active_").removeClass("spotlight-active_");
						len = self.el_.find(".spotlight-list_ .spotlight-item_").length;
						if (len < 1) return;
						index = Math.min(len - 1, active.prevAll(".spotlight-item_").length + 1);
						active = self.el_.find(".spotlight-list_ .spotlight-item_").nth(index).addClass("spotlight-active_");
						
						// update opens-with-icon
						self.opensWithIcon_.css({"background-image": `url('/ant/icons/app-icon-${active.attr("data-opens-with")}.png')`});

						//console.log( ledger.selectSingleNode(`//Spotlight//*[@match-id = "${id}"]`) );
						manager.render_({
							template: "_hit-details",
							match: `//Spotlight//*[@match-id = "${active.attr("data-id")}"]`,
							target: self.el_.find(".preview-wrapper_")
						});
						break;
					case 91: // meta
						self.el_.addClass("show-file-path_");
						break;
				}

				break;
			case "keyup":
				if (event.which === 91) {
					return self.el_.removeClass("show-file-path_");
				}
				if (!this.value) {
					self.opensWithIcon_.css({"background-image": "none"});
					self.el_.removeClass("show-matches_");
					return;
				}
				if (~[13, 27, 38, 40].indexOf(event.which)) return;

				//console.log( self.inputContent_, this.value );
				self.inputContent_.text(this.value);

				// clean up first
				ledger.selectNodes("//Spotlight/*").map(node => {
					while (node.hasChildNodes()) node.removeChild(node.firstChild);
				});

				let xApp = ledger.selectSingleNode("//Spotlight/*[@name='Applications']"),
					xFiles = ledger.selectSingleNode("//Spotlight/*[@name='Files']"),
					alfa = "abcdefghijklmnopqrstuvwxyz",
					matches;

				matches = ledger.selectNodes(`//FileSystem//*[contains(translate(@name, '${alfa.toUpperCase()}', '${alfa}'), "${this.value}")]`);
				matches.map(item => {
					let clone = item.cloneNode(),
						path = fs.path_.fromNode_(item),
						opensWith = fs.path_.opensWith_(path),
						kind = item.getAttribute("kind");
					if (item.getAttribute("link")) return;

					switch (kind) {
						case "app":
							id = clone.getAttribute("id");
							clone.setAttribute("match-shell", `win -o ${id}`);
							clone.setAttribute("opens-with", id);
							xApp.appendChild(clone);
							break;
						case "gif":
						case "jpg":
						case "png":
						case "svg":
							clone.setAttribute("bg-path", path +"?w=232&h=148");
						case "_dir":
							if (item.hasChildNodes()) {
								clone.setAttribute("child-count", item.childNodes.length);
							}
						default:
							clone.setAttribute("match-shell", `fs -o '${path.slice(3).replace(/ /g, "\ ")}'`);
							clone.setAttribute("item-path", path.slice(4));
							clone.setAttribute("opens-with", opensWith);
							xFiles.appendChild(clone);
					}
				});

				if (!matches.length) {
					self.opensWithIcon_.css({"background-image": "none"});
					return self.el_.removeClass("show-matches_").addClass("spotlight-no-matches_");
				}

				// tag matches with id's
				ledger.selectNodes("//Spotlight/*/*").map((node, index) => {
					node.setAttribute("match-id", index + 1);
				});

				// render matches
				manager.render_({
					template: "_spotlight-hits",
					match: "//Spotlight",
					target: self.el_.find(".spotlight-matches_")
				});

				manager.render_({
					template: "_hit-details",
					match: `//Spotlight//*[@match-id = "1"]`,
					target: self.el_.find(".preview-wrapper_")
				});

				// update opens-with-icon
				active = self.el_.find(".spotlight-list_ .spotlight-active_");
				self.opensWithIcon_.css({"background-image": `url('/ant/icons/app-icon-${active.attr("data-opens-with")}.png')`});
				
				self.el_.addClass("show-matches_");
				break;
		}
	},
	toggleSearch_() {
		if (this.el_.hasClass("spotlight-show_")) {
			this.el_.find(".spotlight-input_ input").blur();
			this.el_.removeClass("spotlight-show_ spotlight-no-matches_");
		} else {
			this.el_.addClass("spotlight-show_").removeClass("spotlight-no-matches_").removeClass("show-matches_");
			this.el_.find(".spotlight-input_ input").focus();
		}
	}
},
		keyBoard_: 
// defiant_.keyBoard_

{
	nonText_: [8, 9, 16, 17, 18, 19, 20, 27, 33, 34, 35, 36, 37, 38,39, 40, 45, 46, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 144, 145],
	specialKeys_: {
		8: "backspace", 9: "tab", 13: "return", 16: "shift", 17: "ctrl", 18: "alt", 19: "pause",
		20: "capslock", 27: "esc", 32: "space", 33: "pageup", 34: "pagedown", 35: "end", 36: "home",
		37: "left", 38: "up", 39: "right", 40: "down", 45: "insert", 46: "del", 91: "meta", 93: "meta",
		96: "0", 97: "1", 98: "2", 99: "3", 100: "4", 101: "5", 102: "6", 103: "7",
		104: "8", 105: "9", 106: "*", 107: "+", 109: "-", 110: ".", 111 : "/",
		112: "f1", 113: "f2", 114: "f3", 115: "f4", 116: "f5", 117: "f6", 118: "f7", 119: "f8",
		120: "f9", 121: "f10", 122: "f11", 123: "f12", 144: "numlock", 145: "scroll", 191: "/", 224: "meta"
	},
	init_() {
		// subscribe to events
		defiant_.on_("fs.loaded", event =>
			$(document).bind("keydown", this.doEvent_));
	},
	doEvent_(event) {
		let active = defiant_.workSpace_.getActive_();
		if (!active) return;
		const { app, bluePrint } = active;
		let self = defiant_.keyBoard_,
			keyCode = event.which || event.keyCode,
			isText = self.nonText_.indexOf(keyCode) === -1,
			isInput = ["input", "textarea"].indexOf(event.target.nodeName.toLowerCase()) > -1,
			special = self.specialKeys_[keyCode],
			char = String.fromCharCode(keyCode),
			combo = [],
			data = {};

		const dispatchKeyStroke = () => {
			data.type = "keystroke";
			data.char = special || char;
			data.keyCode = keyCode;

			if (!isText && isInput) {
				data.target = event.target;
				data.value = isText ? event.target.value + char : event.target.value;
			}
			["altKey", "ctrlKey", "metaKey", "shiftKey"].map(item => data[item] = event[item]);

			app.dispatch(data);
		};

		switch (event.type) {
			case "keydown":
				if (event.altKey) combo.push("alt");
				if (event.ctrlKey) combo.push("control");
				if (event.metaKey) combo.push("meta");
				if (event.shiftKey) combo.push("shift");
				
				if (char.match(/[a-z0-9,]/ig) !== null) {
					// assemble keyboard combination
					combo.push(char.toLowerCase());
				} else if (combo.indexOf(special) === -1) {
					combo.push(special);
				}
			
				if (combo.length < 2 && isInput && keyCode === 9) {
					event.preventDefault();
				}

				let xMenuItem = bluePrint.selectSingleNode(`.//Menu[@hotkey="${combo.join("+")}"]`);
				if (!xMenuItem) {
					xMenuItem = defiant_.manager_.ledger_.selectSingleNode(`//Hotkeys//Menu[@hotkey="${combo.join("+")}"]`);
				}
				if (combo.length > 1 && xMenuItem) {
					// prevent default behaviour
					event.preventDefault();
					
					// execute shell command, if any
					let action = xMenuItem.getAttribute("shell");
					if (action) {
						return defiant_.shell_.execute_(action);
					}

					if (app && typeof app.dispatch === "function") {
						data.type = xMenuItem.getAttribute("click");
						data.arg = xMenuItem.getAttribute("arg");
						if (!data.arg) delete data.arg;

						return app.dispatch(data);
					}
				} else if (app && typeof app.dispatch === "function") {
					setTimeout(dispatchKeyStroke);
				}
				break;
		}
	}
}
,
		manager_: 
// defiant_.manager_

{
	encrypt: {},
	async init_() {
		let root = defiant_,
			resp = await $.fetch(`/res/xml/ledger.${document.version}.xml`),
			templates = resp.selectSingleNode("//xsl:stylesheet"),
			svg = resp.selectSingleNode("/ledger/svg");

		// cache icons & detach svg resources from ledger
		root.body_.find("> svg").append(svg.innerHTML);
		svg.parentNode.removeChild(svg);

		this.templates_ = $.xmlFromString(templates.xml);
		this.processor_ = new XSLTProcessor();
		this.processor_.importStylesheet(this.templates_);
		templates.parentNode.removeChild(templates);

		this.ledger_ = resp.documentElement;
		this.tagIds_();

		// encryption keys
		let s = ".ant-window,.win-toolbar,.win-status-bar,.win-body,.generic-item,_".split(",");
		
		this.encrypt[s[0]+s[5]] = ".ant-window_";
		this.encrypt[s[1]+s[5]] = ".win-toolbar_";
		this.encrypt[s[2]+s[5]] = ".win-status-bar_";
		this.encrypt[s[3]+s[5]] = ".win-body_";
		this.encrypt[s[4]+s[5]] = ".generic-item_";

		// emit event
		root.emit_("ledger.loaded");

		// create and cache icons in SW
		let svgIcons = $("body > svg[width=0] > svg");
		//root.sw_.cacheIcons_(false, svgIcons, () => this.load_("login"));

		root.sw_.cacheIcons_(false, svgIcons, async () => {
			// emit event
			defiant_.emit_("fs.loaded");
		});
	},
	async devTemp_() {
		// tmp
		//defiant_.shell_.execute_("fs -o '/doc/pdf/sample-3pp.pdf'");
		//defiant_.shell_.execute_("fs -o '/usr/mp3/Ayben - Rap Benim.mp3'");
		//defiant_.shell_.execute_("fs -o '/usr/Deep Learning.txt'");
		//defiant_.shell_.execute_("fs -o '/usr/mp3/Eclectek_-_02_-_We_Are_Going_To_Eclecfunk_Your_Ass.mp3'");
		//defiant_.shell_.execute_("fs -u '/app/ant/sudoku/help/index.md'");

		//defiant_.shell_.execute_(`fs -o "/doc/Neohub Developer Guide/toc.md"`);
		//defiant_.shell_.execute_(`fs -l "/doc/" | neo -e`);

		// setTimeout(() => {
		// 	defiant_.menu_.doc.find('.menu-bar_ .menubar-menu_:nth(1)').trigger("mousedown");
		// }, 100);
	},
	readLoginData_(data) {
		// transfer all children to ledger
		data.documentElement.selectNodes("./*").map(item => {
			switch (item.nodeName) {
				case "Application":
					this.ledger_.selectSingleNode("//applications").appendChild(item);
					break;
				default:
					this.ledger_.appendChild(item);
			}
		});
		// UI update
		defiant_.body_.addClass("logged-in_");
		// FS related
		defiant_.fileSystem_.translateDates_("//FileSystem");
		defiant_.fileSystem_.translateDates_();
		this.tagIds_();

		// parse AppStore
		this.cacheAppIcons_();
	},
	async cacheAppIcons_() {
		let appRoot = this.ledger_.selectSingleNode("//FileSystem/*[@name='app']"),
			antApps = await $.fetch("/res/xml/all-icons.xml"),
			apps = antApps.selectNodes("/app-store/i"),
			svgIcons = [];
		
		apps.map(app => {
			let name = "app-icon-"+ app.getAttribute("id"),
				str = app.textContent.trim(),
				item = app.cloneNode(),
				icon = str ? "app-icon-"+ app.getAttribute("id") : "default-app",
				moment = new Moment(+app.getAttribute("mStamp"));
			
			item.setAttribute("icon", icon);
			item.setAttribute("kind", "app");
			item.setAttribute("mDate", moment.format("D MMM YYYY"));
			item.setAttribute("mTime", moment.format("HH:mm"));
			item.setAttribute("isodate", moment.format("YYYY-MM-DD HH:mm"));
			// append to user app folder
			appRoot.appendChild(item);

			if (!str) return;
			svgIcons.push({ name, str });
		});

		defiant_.sw_.cacheIcons_(false, svgIcons, () => {
			// emit event
			defiant_.emit_("fs.loaded");
			// tmp
			this.devTemp_();
		});
	},
	mId: Date.now(),
	tagIds_() {
		this.ledger_.selectNodes("//Menu[not(@_id)]").map(item => item.setAttribute("_id", "c"+ (this.mId++)));
	},
	async load_(name, workSpaceId, dim) {
		let bluePrint = this.ledger_.selectSingleNode(`//Application[.//meta/@name="id" and .//meta/@value="${name}"]`),
			xApps,
			resp;

		if (bluePrint) {
			return this.preCacheIcons_(bluePrint, workSpaceId, dim);
		}

		xApps = this.ledger_.selectSingleNode("//applications");
		resp = await $.fetch(`/app/ant/${name}`);
		bluePrint = xApps.appendChild(resp.documentElement);

		// add menubar if application does not have menubar
		defiant_.menuBar_.checkMenuBar_(bluePrint);

		// tag menu items with unique id's
		this.tagIds_();
		
		return this.preCacheIcons_(bluePrint, workSpaceId, dim);
	},
	unload_(name) {
		// remove xsl templates nodes of application
		let templates = this.templates_.selectNodes(`//xsl:template[@app="${name}"]`);
		templates.map(template => template.parentNode.removeChild(template));
		this.processor_ = new XSLTProcessor();
		this.processor_.importStylesheet(this.templates_);

		// remove shell nodes of application
		this.ledger_.selectNodes(`//Shell//*[@ant:app = "${name}"]`)
			.map(node => node.parentNode.removeChild(node));

		return defiant_.workSpace_.remove_(name);
	},
	preCacheIcons_(bluePrint, workSpaceId, dim) {
		let winIcons = bluePrint.selectSingleNode(".//WindowIcons"),
			id = bluePrint.selectSingleNode(".//meta[@name='id']").getAttribute("value"),
			swap = document.createElement("span");
		
		if (winIcons) {
			swap.innerHTML = winIcons.textContent.trim();

			let svgIcons = $("svg > svg:not([nocache])", swap);
			if (svgIcons.length) {
				return new Promise((resolve, reject) => {
					defiant_.sw_.cacheIcons_(id, svgIcons, () => {
						// update blueprint if non-cached icons
						winIcons.textContent = $("svg > svg", swap).length ? swap.firstChild.xml : "";
						// continue parsing app
						let app = this.parseApplication_(bluePrint, workSpaceId, dim);
						// return app
						resolve(app);
					});
				});
			}
		}
		// start app - there is no icons
		return this.parseApplication_(bluePrint, workSpaceId, dim);
	},
	parseApplication_(bluePrint, workSpaceId, dim) {
		let workspace = defiant_.workSpace_,
			fs = defiant_.fileSystem_,
			id = bluePrint.selectSingleNode(".//meta[@name='id']").getAttribute("value"),
			nodes = bluePrint.selectNodes(".//xsl:template"),
			swap = document.createElement("span"),
			meta,
			value,
			winIcons,
			htm,
			style,
			styleText,
			script,
			scriptText,
			globalScript;

		// dimensions
		if (dim) {
			for (let key in dim) {
				meta = bluePrint.selectSingleNode(`.//meta[@name="${key}"]`);
				if (meta) meta.setAttribute("value", dim[key]);
			}
		}

		// templates: renaming templates to avoid clashes between apps
		if (nodes.length) {
			nodes.map(template => {
				let clone = template.cloneNode(true),
					name = clone.getAttribute("name");
				clone.setAttribute("name", id +"-"+ name);
				clone.setAttribute("app", id);

				clone.selectNodes(".//xsl:call-template").map(call => {
					let name = call.getAttribute("name"),
						rename = name.slice(0, 4) === "sys:" ? name.slice(4) : id +"-"+ name;
					call.setAttribute("name", rename);
				});

				this.templates_.documentElement.appendChild(clone);
			});
			this.processor_ = new XSLTProcessor();
			this.processor_.importStylesheet(this.templates_);
		}

		// shell commands
		nodes = bluePrint.selectNodes(".//Shell/*");
		if (nodes.length) {
			let shellRoot = this.ledger_.selectSingleNode("/ledger/Shell");

			nodes.map(node => {
				let clone = node.cloneNode(true);
				clone.setAttribute("ant:app", id);
				shellRoot.appendChild(clone);
			});
		}

		// style of app
		style = bluePrint.selectSingleNode(".//style");
		if (style) {
			// use swap element to evaluate app styles
			styleText = style.textContent.trim();

			// encrypt css
			for (let key in this.encrypt) {
				let rx = new RegExp(`\\${key}`, "g");
				styleText = styleText.replace(rx, this.encrypt[key]);
			}
			swap.innerHTML = `<style data-id="${id}">${styleText}</style>`;

			// append app style at the end of body
			defiant_.body_.append(swap.childNodes[0]);
		}

		// html of app
		htm = this.render_({
			template: "_window",
			match: `//Application[.//meta/@name="id" and .//meta/@value="${id}"]`
		});
		const entity = workspace.append_(htm, workSpaceId);

		winIcons = bluePrint.selectSingleNode(".//WindowIcons");
		if (winIcons) entity.win.el.find(".win-body_").append(winIcons.textContent);

		// global script of app
		globalScript = bluePrint.selectSingleNode(".//script[@global]");
		if (globalScript) {
			swap = document.createElement('script');
			swap.setAttribute('app-id', id);
			swap.innerHTML = atob(globalScript.textContent).trim();
			document.body.appendChild(swap);
		}

		// script of app
		script = bluePrint.selectSingleNode(".//script[not(@global)]");
		if (script) {
			// get app script and evaluate in container
			scriptText = script.textContent.trim();
			
			// execution container
			const app = (code => {
				const defiant = {
					imports: [],
					window: new Window_(entity, bluePrint),
					shell: command => defiant_.shell_.execute_(command, id),
					log: function() {
						const args = [].slice.call(arguments);
						args.unshift(`defiant.${id} ~`);
						console.log.apply({}, args);
					},
					warn: function() {}
				};
				// global imports
				code.replace(/(let|const) (\w+)=defiant.(\w+);/mg, (m, l, v, v2) => {
					if (v === v2) {
						defiant[v] = window[v];
						defiant.imports.push(v);
					}
				})

				if (id === "login") {
					defiant.load = this.readLoginData_.bind(this);
				}

				// freeze passed fake object
				Object.freeze(defiant);

				const codeStr = `const window = defiant.window;
								const setTimeout = window.setTimeout.bind(window);
								const setInterval = window.setInterval.bind(window);
								const console = {log: defiant.log, warn: defiant.warn}; ${code};`;
				
				try {
					new Function("defiant", codeStr).call(defiant.window, defiant);
				} catch (error) {
					console.log("App error handling: ", error);
				}

				return defiant;
			})(scriptText);

			// update workspace reference
			entity.app = app.window.exports;
			entity.imports = app.imports;
			entity.win = app.window;
			entity.bluePrint = bluePrint;

			// delete instance of app object
			delete app.window.exports;
		}

		if (entity.app) {
			if (typeof entity.app.init === "function") {
				entity.app.init();
			}
			if (typeof entity.app.dispatch === "function") {
				setTimeout(() => entity.app.dispatch({type: "window.open"}));
			}
		}
		
		return entity.app;
	},
	render_(opt) {
		let span = document.createElement("span"),
			xPath = opt.app ? `//xsl:template[@name="${opt.template}" and @app="${opt.app}"]` : `//xsl:template[@name="${opt.template}"]`,
			template = this.templates_.selectSingleNode(xPath),
			data = opt.data || this.ledger_,
			xSort,
			fragment;
		
		if (opt.sortNodeXpath) {
			xSort = template.selectSingleNode(xPath + opt.sortNodeXpath);
			if (opt.sortSelect) xSort.setAttribute("select", opt.sortSelect);
			if (opt.sortOrder) xSort.setAttribute("order", opt.sortOrder);
			if (opt.sortType) xSort.setAttribute("data-type", opt.sortType);
		}

		template.setAttribute("match", opt.match);
		fragment = this.processor_.transformToFragment(data, document);
		template.removeAttribute("match");

		span.appendChild(fragment);
		fragment = span.innerHTML;
		fragment = fragment
			.replace(/ xmlns\:xlink="http\:\/\/www.w3.org\/1999\/xlink"/g, "")
			.replace(/ xmlns\:dfs="dfs.defiant_.com"/g, "")
			.replace(/ xmlns\:xsl="http\:\/\/www.w3.org\/1999\/XSL\/Transform"/g, "");

		if (defiant_.browser_ === "firefox") {
			fragment = fragment.replace(/ style="\n[^]*"/gm, m => {
				m = m.replace(/ {2,}/g, "");
				m = m.replace(/\n/g, "");
				return m;
			});
			fragment = fragment.replace(/<div class="win-body_">[^]*<\/div>/gm, m => {
				m = m.replace(/&lt;/g, "<");
				m = m.replace(/&gt;/g, ">");
				m = m.replace(/&amp;/g, "&");
				return m;
			});
		}
		fragment = fragment.replace(/="[^"]+?"/gm, function(m) {
			return m.replace(/\t|\n/g, "").replace(/ {2,}/g, " ");
		});
		
		if (opt.append) return opt.append.append(fragment);
		else if (opt.after) return opt.after.after(fragment);
		else if (opt.target) return opt.target.html(fragment).find("> :last-child");
		else return fragment;
	},
	info_() {
		let xSys = this.ledger_.selectSingleNode("//details/meta[@name='system']"),
			xCompany = this.ledger_.selectSingleNode("//details/meta[@name='company']"),
			xAuthor = this.ledger_.selectSingleNode("//details/meta[@name='author']");
		return {
			name: xSys.getAttribute("value"),
			version: xSys.getAttribute("version"),
			company: xCompany.getAttribute("value"),
			author: xAuthor.getAttribute("value"),
			email: xAuthor.getAttribute("email"),
		};
	}
}

	};

	const $ = 
(function(window, document) {
	'use strict';

	/*! Sizzle v2.3.4-pre | (c) JS Foundation and other contributors | js.foundation */
	!function(a){var b,c,d,e,f,g,h,i,j,k,l,m,n,o,p,q,r,s,t,u="sizzle"+1*new Date,v=a.document,w=0,x=0,y=ia(),z=ia(),A=ia(),B=ia(),C=function(a,b){return a===b&&(l=!0),0},D={}.hasOwnProperty,E=[],F=E.pop,G=E.push,H=E.push,I=E.slice,J=function(a,b){for(var c=0,d=a.length;c<d;c++)if(a[c]===b)return c;return-1},K="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",L="[\\x20\\t\\r\\n\\f]",M="(?:\\\\.|[\\w-]|[^\0-\\xa0])+",N="\\["+L+"*("+M+")(?:"+L+"*([*^$|!~]?=)"+L+"*(?:'((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\"|("+M+"))|)"+L+"*\\]",O=":("+M+")(?:\\((('((?:\\\\.|[^\\\\'])*)'|\"((?:\\\\.|[^\\\\\"])*)\")|((?:\\\\.|[^\\\\()[\\]]|"+N+")*)|.*)\\)|)",P=new RegExp(L+"+","g"),Q=new RegExp("^"+L+"+|((?:^|[^\\\\])(?:\\\\.)*)"+L+"+$","g"),R=new RegExp("^"+L+"*,"+L+"*"),S=new RegExp("^"+L+"*([>+~]|"+L+")"+L+"*"),T=new RegExp("="+L+"*([^\\]'\"]*?)"+L+"*\\]","g"),U=new RegExp(O),V=new RegExp("^"+M+"$"),W={ID:new RegExp("^#("+M+")"),CLASS:new RegExp("^\\.("+M+")"),TAG:new RegExp("^("+M+"|[*])"),ATTR:new RegExp("^"+N),PSEUDO:new RegExp("^"+O),CHILD:new RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+L+"*(even|odd|(([+-]|)(\\d*)n|)"+L+"*(?:([+-]|)"+L+"*(\\d+)|))"+L+"*\\)|)","i"),bool:new RegExp("^(?:"+K+")$","i"),needsContext:new RegExp("^"+L+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+L+"*((?:-\\d)?\\d*)"+L+"*\\)|)(?=[^-]|$)","i")},X=/^(?:input|select|textarea|button)$/i,Y=/^h\d$/i,Z=/^[^{]+\{\s*\[native \w/,$=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,_=/[+~]/,aa=new RegExp("\\\\([\\da-f]{1,6}"+L+"?|("+L+")|.)","ig"),ba=function(a,b,c){var d="0x"+b-65536;return d!==d||c?b:d<0?String.fromCharCode(d+65536):String.fromCharCode(d>>10|55296,1023&d|56320)},ca=/([\0-\x1f\x7f]|^-?\d)|^-$|[^\0-\x1f\x7f-\uFFFF\w-]/g,da=function(a,b){return b?"\0"===a?"\ufffd":a.slice(0,-1)+"\\"+a.charCodeAt(a.length-1).toString(16)+" ":"\\"+a},ea=function(){m()},fa=ua(function(a){return a.disabled===!0&&"fieldset"===a.nodeName.toLowerCase()},{dir:"parentNode",next:"legend"});try{H.apply(E=I.call(v.childNodes),v.childNodes),E[v.childNodes.length].nodeType}catch(ga){H={apply:E.length?function(a,b){G.apply(a,I.call(b))}:function(a,b){var c=a.length,d=0;while(a[c++]=b[d++]);a.length=c-1}}}function ha(a,b,d,e){var f,h,j,k,l,o,r,s=b&&b.ownerDocument,w=b?b.nodeType:9;if(d=d||[],"string"!=typeof a||!a||1!==w&&9!==w&&11!==w)return d;if(!e&&((b?b.ownerDocument||b:v)!==n&&m(b),b=b||n,p)){if(11!==w&&(l=$.exec(a)))if(f=l[1]){if(9===w){if(!(j=b.getElementById(f)))return d;if(j.id===f)return d.push(j),d}else if(s&&(j=s.getElementById(f))&&t(b,j)&&j.id===f)return d.push(j),d}else{if(l[2])return H.apply(d,b.getElementsByTagName(a)),d;if((f=l[3])&&c.getElementsByClassName&&b.getElementsByClassName)return H.apply(d,b.getElementsByClassName(f)),d}if(c.qsa&&!B[a+" "]&&(!q||!q.test(a))){if(1!==w)s=b,r=a;else if("object"!==b.nodeName.toLowerCase()){(k=b.getAttribute("id"))?k=k.replace(ca,da):b.setAttribute("id",k=u),o=g(a),h=o.length;while(h--)o[h]="#"+k+" "+ta(o[h]);r=o.join(","),s=_.test(a)&&ra(b.parentNode)||b}if(r)try{return H.apply(d,s.querySelectorAll(r)),d}catch(x){B(a)}finally{k===u&&b.removeAttribute("id")}}}return i(a.replace(Q,"$1"),b,d,e)}function ia(){var a=[];function b(c,e){return a.push(c+" ")>d.cacheLength&&delete b[a.shift()],b[c+" "]=e}return b}function ja(a){return a[u]=!0,a}function ka(a){var b=n.createElement("fieldset");try{return!!a(b)}catch(c){return!1}finally{b.parentNode&&b.parentNode.removeChild(b),b=null}}function la(a,b){var c=a.split("|"),e=c.length;while(e--)d.attrHandle[c[e]]=b}function ma(a,b){var c=b&&a,d=c&&1===a.nodeType&&1===b.nodeType&&a.sourceIndex-b.sourceIndex;if(d)return d;if(c)while(c=c.nextSibling)if(c===b)return-1;return a?1:-1}function na(a){return function(b){var c=b.nodeName.toLowerCase();return"input"===c&&b.type===a}}function oa(a){return function(b){var c=b.nodeName.toLowerCase();return("input"===c||"button"===c)&&b.type===a}}function pa(a){return function(b){return"form"in b?b.parentNode&&b.disabled===!1?"label"in b?"label"in b.parentNode?b.parentNode.disabled===a:b.disabled===a:b.isDisabled===a||b.isDisabled!==!a&&fa(b)===a:b.disabled===a:"label"in b&&b.disabled===a}}function qa(a){return ja(function(b){return b=+b,ja(function(c,d){var e,f=a([],c.length,b),g=f.length;while(g--)c[e=f[g]]&&(c[e]=!(d[e]=c[e]))})})}function ra(a){return a&&"undefined"!=typeof a.getElementsByTagName&&a}c=ha.support={},f=ha.isXML=function(a){var b=a&&(a.ownerDocument||a).documentElement;return!!b&&"HTML"!==b.nodeName},m=ha.setDocument=function(a){var b,e,g=a?a.ownerDocument||a:v;return g!==n&&9===g.nodeType&&g.documentElement?(n=g,o=n.documentElement,p=!f(n),v!==n&&(e=n.defaultView)&&e.top!==e&&(e.addEventListener?e.addEventListener("unload",ea,!1):e.attachEvent&&e.attachEvent("onunload",ea)),c.attributes=ka(function(a){return a.className="i",!a.getAttribute("className")}),c.getElementsByTagName=ka(function(a){return a.appendChild(n.createComment("")),!a.getElementsByTagName("*").length}),c.getElementsByClassName=Z.test(n.getElementsByClassName),c.getById=ka(function(a){return o.appendChild(a).id=u,!n.getElementsByName||!n.getElementsByName(u).length}),c.getById?(d.filter.ID=function(a){var b=a.replace(aa,ba);return function(a){return a.getAttribute("id")===b}},d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c=b.getElementById(a);return c?[c]:[]}}):(d.filter.ID=function(a){var b=a.replace(aa,ba);return function(a){var c="undefined"!=typeof a.getAttributeNode&&a.getAttributeNode("id");return c&&c.value===b}},d.find.ID=function(a,b){if("undefined"!=typeof b.getElementById&&p){var c,d,e,f=b.getElementById(a);if(f){if(c=f.getAttributeNode("id"),c&&c.value===a)return[f];e=b.getElementsByName(a),d=0;while(f=e[d++])if(c=f.getAttributeNode("id"),c&&c.value===a)return[f]}return[]}}),d.find.TAG=c.getElementsByTagName?function(a,b){return"undefined"!=typeof b.getElementsByTagName?b.getElementsByTagName(a):c.qsa?b.querySelectorAll(a):void 0}:function(a,b){var c,d=[],e=0,f=b.getElementsByTagName(a);if("*"===a){while(c=f[e++])1===c.nodeType&&d.push(c);return d}return f},d.find.CLASS=c.getElementsByClassName&&function(a,b){if("undefined"!=typeof b.getElementsByClassName&&p)return b.getElementsByClassName(a)},r=[],q=[],(c.qsa=Z.test(n.querySelectorAll))&&(ka(function(a){o.appendChild(a).innerHTML="<a id='"+u+"'></a><select id='"+u+"-\r\\' msallowcapture=''><option selected=''></option></select>",a.querySelectorAll("[msallowcapture^='']").length&&q.push("[*^$]="+L+"*(?:''|\"\")"),a.querySelectorAll("[selected]").length||q.push("\\["+L+"*(?:value|"+K+")"),a.querySelectorAll("[id~="+u+"-]").length||q.push("~="),a.querySelectorAll(":checked").length||q.push(":checked"),a.querySelectorAll("a#"+u+"+*").length||q.push(".#.+[+~]")}),ka(function(a){a.innerHTML="<a href='' disabled='disabled'></a><select disabled='disabled'><option/></select>";var b=n.createElement("input");b.setAttribute("type","hidden"),a.appendChild(b).setAttribute("name","D"),a.querySelectorAll("[name=d]").length&&q.push("name"+L+"*[*^$|!~]?="),2!==a.querySelectorAll(":enabled").length&&q.push(":enabled",":disabled"),o.appendChild(a).disabled=!0,2!==a.querySelectorAll(":disabled").length&&q.push(":enabled",":disabled"),a.querySelectorAll("*,:x"),q.push(",.*:")})),(c.matchesSelector=Z.test(s=o.matches||o.webkitMatchesSelector||o.mozMatchesSelector||o.oMatchesSelector||o.msMatchesSelector))&&ka(function(a){c.disconnectedMatch=s.call(a,"*"),s.call(a,"[s!='']:x"),r.push("!=",O)}),q=q.length&&new RegExp(q.join("|")),r=r.length&&new RegExp(r.join("|")),b=Z.test(o.compareDocumentPosition),t=b||Z.test(o.contains)?function(a,b){var c=9===a.nodeType?a.documentElement:a,d=b&&b.parentNode;return a===d||!(!d||1!==d.nodeType||!(c.contains?c.contains(d):a.compareDocumentPosition&&16&a.compareDocumentPosition(d)))}:function(a,b){if(b)while(b=b.parentNode)if(b===a)return!0;return!1},C=b?function(a,b){if(a===b)return l=!0,0;var d=!a.compareDocumentPosition-!b.compareDocumentPosition;return d?d:(d=(a.ownerDocument||a)===(b.ownerDocument||b)?a.compareDocumentPosition(b):1,1&d||!c.sortDetached&&b.compareDocumentPosition(a)===d?a===n||a.ownerDocument===v&&t(v,a)?-1:b===n||b.ownerDocument===v&&t(v,b)?1:k?J(k,a)-J(k,b):0:4&d?-1:1)}:function(a,b){if(a===b)return l=!0,0;var c,d=0,e=a.parentNode,f=b.parentNode,g=[a],h=[b];if(!e||!f)return a===n?-1:b===n?1:e?-1:f?1:k?J(k,a)-J(k,b):0;if(e===f)return ma(a,b);c=a;while(c=c.parentNode)g.unshift(c);c=b;while(c=c.parentNode)h.unshift(c);while(g[d]===h[d])d++;return d?ma(g[d],h[d]):g[d]===v?-1:h[d]===v?1:0},n):n},ha.matches=function(a,b){return ha(a,null,null,b)},ha.matchesSelector=function(a,b){if((a.ownerDocument||a)!==n&&m(a),b=b.replace(T,"='$1']"),c.matchesSelector&&p&&!B[b+" "]&&(!r||!r.test(b))&&(!q||!q.test(b)))try{var d=s.call(a,b);if(d||c.disconnectedMatch||a.document&&11!==a.document.nodeType)return d}catch(e){B(b)}return ha(b,n,null,[a]).length>0},ha.contains=function(a,b){return(a.ownerDocument||a)!==n&&m(a),t(a,b)},ha.attr=function(a,b){(a.ownerDocument||a)!==n&&m(a);var e=d.attrHandle[b.toLowerCase()],f=e&&D.call(d.attrHandle,b.toLowerCase())?e(a,b,!p):void 0;return void 0!==f?f:c.attributes||!p?a.getAttribute(b):(f=a.getAttributeNode(b))&&f.specified?f.value:null},ha.escape=function(a){return(a+"").replace(ca,da)},ha.error=function(a){throw new Error("Syntax error, unrecognized expression: "+a)},ha.uniqueSort=function(a){var b,d=[],e=0,f=0;if(l=!c.detectDuplicates,k=!c.sortStable&&a.slice(0),a.sort(C),l){while(b=a[f++])b===a[f]&&(e=d.push(f));while(e--)a.splice(d[e],1)}return k=null,a},e=ha.getText=function(a){var b,c="",d=0,f=a.nodeType;if(f){if(1===f||9===f||11===f){if("string"==typeof a.textContent)return a.textContent;for(a=a.firstChild;a;a=a.nextSibling)c+=e(a)}else if(3===f||4===f)return a.nodeValue}else while(b=a[d++])c+=e(b);return c},d=ha.selectors={cacheLength:50,createPseudo:ja,match:W,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(a){return a[1]=a[1].replace(aa,ba),a[3]=(a[3]||a[4]||a[5]||"").replace(aa,ba),"~="===a[2]&&(a[3]=" "+a[3]+" "),a.slice(0,4)},CHILD:function(a){return a[1]=a[1].toLowerCase(),"nth"===a[1].slice(0,3)?(a[3]||ha.error(a[0]),a[4]=+(a[4]?a[5]+(a[6]||1):2*("even"===a[3]||"odd"===a[3])),a[5]=+(a[7]+a[8]||"odd"===a[3])):a[3]&&ha.error(a[0]),a},PSEUDO:function(a){var b,c=!a[6]&&a[2];return W.CHILD.test(a[0])?null:(a[3]?a[2]=a[4]||a[5]||"":c&&U.test(c)&&(b=g(c,!0))&&(b=c.indexOf(")",c.length-b)-c.length)&&(a[0]=a[0].slice(0,b),a[2]=c.slice(0,b)),a.slice(0,3))}},filter:{TAG:function(a){var b=a.replace(aa,ba).toLowerCase();return"*"===a?function(){return!0}:function(a){return a.nodeName&&a.nodeName.toLowerCase()===b}},CLASS:function(a){var b=y[a+" "];return b||(b=new RegExp("(^|"+L+")"+a+"("+L+"|$)"))&&y(a,function(a){return b.test("string"==typeof a.className&&a.className||"undefined"!=typeof a.getAttribute&&a.getAttribute("class")||"")})},ATTR:function(a,b,c){return function(d){var e=ha.attr(d,a);return null==e?"!="===b:!b||(e+="","="===b?e===c:"!="===b?e!==c:"^="===b?c&&0===e.indexOf(c):"*="===b?c&&e.indexOf(c)>-1:"$="===b?c&&e.slice(-c.length)===c:"~="===b?(" "+e.replace(P," ")+" ").indexOf(c)>-1:"|="===b&&(e===c||e.slice(0,c.length+1)===c+"-"))}},CHILD:function(a,b,c,d,e){var f="nth"!==a.slice(0,3),g="last"!==a.slice(-4),h="of-type"===b;return 1===d&&0===e?function(a){return!!a.parentNode}:function(b,c,i){var j,k,l,m,n,o,p=f!==g?"nextSibling":"previousSibling",q=b.parentNode,r=h&&b.nodeName.toLowerCase(),s=!i&&!h,t=!1;if(q){if(f){while(p){m=b;while(m=m[p])if(h?m.nodeName.toLowerCase()===r:1===m.nodeType)return!1;o=p="only"===a&&!o&&"nextSibling"}return!0}if(o=[g?q.firstChild:q.lastChild],g&&s){m=q,l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),j=k[a]||[],n=j[0]===w&&j[1],t=n&&j[2],m=n&&q.childNodes[n];while(m=++n&&m&&m[p]||(t=n=0)||o.pop())if(1===m.nodeType&&++t&&m===b){k[a]=[w,n,t];break}}else if(s&&(m=b,l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),j=k[a]||[],n=j[0]===w&&j[1],t=n),t===!1)while(m=++n&&m&&m[p]||(t=n=0)||o.pop())if((h?m.nodeName.toLowerCase()===r:1===m.nodeType)&&++t&&(s&&(l=m[u]||(m[u]={}),k=l[m.uniqueID]||(l[m.uniqueID]={}),k[a]=[w,t]),m===b))break;return t-=e,t===d||t%d===0&&t/d>=0}}},PSEUDO:function(a,b){var c,e=d.pseudos[a]||d.setFilters[a.toLowerCase()]||ha.error("unsupported pseudo: "+a);return e[u]?e(b):e.length>1?(c=[a,a,"",b],d.setFilters.hasOwnProperty(a.toLowerCase())?ja(function(a,c){var d,f=e(a,b),g=f.length;while(g--)d=J(a,f[g]),a[d]=!(c[d]=f[g])}):function(a){return e(a,0,c)}):e}},pseudos:{not:ja(function(a){var b=[],c=[],d=h(a.replace(Q,"$1"));return d[u]?ja(function(a,b,c,e){var f,g=d(a,null,e,[]),h=a.length;while(h--)(f=g[h])&&(a[h]=!(b[h]=f))}):function(a,e,f){return b[0]=a,d(b,null,f,c),b[0]=null,!c.pop()}}),has:ja(function(a){return function(b){return ha(a,b).length>0}}),contains:ja(function(a){return a=a.replace(aa,ba),function(b){return(b.textContent||b.innerText||e(b)).indexOf(a)>-1}}),lang:ja(function(a){return V.test(a||"")||ha.error("unsupported lang: "+a),a=a.replace(aa,ba).toLowerCase(),function(b){var c;do if(c=p?b.lang:b.getAttribute("xml:lang")||b.getAttribute("lang"))return c=c.toLowerCase(),c===a||0===c.indexOf(a+"-");while((b=b.parentNode)&&1===b.nodeType);return!1}}),target:function(b){var c=a.location&&a.location.hash;return c&&c.slice(1)===b.id},root:function(a){return a===o},focus:function(a){return a===n.activeElement&&(!n.hasFocus||n.hasFocus())&&!!(a.type||a.href||~a.tabIndex)},enabled:pa(!1),disabled:pa(!0),checked:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&!!a.checked||"option"===b&&!!a.selected},selected:function(a){return a.parentNode&&a.parentNode.selectedIndex,a.selected===!0},empty:function(a){for(a=a.firstChild;a;a=a.nextSibling)if(a.nodeType<6)return!1;return!0},parent:function(a){return!d.pseudos.empty(a)},header:function(a){return Y.test(a.nodeName)},input:function(a){return X.test(a.nodeName)},button:function(a){var b=a.nodeName.toLowerCase();return"input"===b&&"button"===a.type||"button"===b},text:function(a){var b;return"input"===a.nodeName.toLowerCase()&&"text"===a.type&&(null==(b=a.getAttribute("type"))||"text"===b.toLowerCase())},first:qa(function(){return[0]}),last:qa(function(a,b){return[b-1]}),eq:qa(function(a,b,c){return[c<0?c+b:c]}),even:qa(function(a,b){for(var c=0;c<b;c+=2)a.push(c);return a}),odd:qa(function(a,b){for(var c=1;c<b;c+=2)a.push(c);return a}),lt:qa(function(a,b,c){for(var d=c<0?c+b:c;--d>=0;)a.push(d);return a}),gt:qa(function(a,b,c){for(var d=c<0?c+b:c;++d<b;)a.push(d);return a})}},d.pseudos.nth=d.pseudos.eq;for(b in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})d.pseudos[b]=na(b);for(b in{submit:!0,reset:!0})d.pseudos[b]=oa(b);function sa(){}sa.prototype=d.filters=d.pseudos,d.setFilters=new sa,g=ha.tokenize=function(a,b){var c,e,f,g,h,i,j,k=z[a+" "];if(k)return b?0:k.slice(0);h=a,i=[],j=d.preFilter;while(h){c&&!(e=R.exec(h))||(e&&(h=h.slice(e[0].length)||h),i.push(f=[])),c=!1,(e=S.exec(h))&&(c=e.shift(),f.push({value:c,type:e[0].replace(Q," ")}),h=h.slice(c.length));for(g in d.filter)!(e=W[g].exec(h))||j[g]&&!(e=j[g](e))||(c=e.shift(),f.push({value:c,type:g,matches:e}),h=h.slice(c.length));if(!c)break}return b?h.length:h?ha.error(a):z(a,i).slice(0)};function ta(a){for(var b=0,c=a.length,d="";b<c;b++)d+=a[b].value;return d}function ua(a,b,c){var d=b.dir,e=b.next,f=e||d,g=c&&"parentNode"===f,h=x++;return b.first?function(b,c,e){while(b=b[d])if(1===b.nodeType||g)return a(b,c,e);return!1}:function(b,c,i){var j,k,l,m=[w,h];if(i){while(b=b[d])if((1===b.nodeType||g)&&a(b,c,i))return!0}else while(b=b[d])if(1===b.nodeType||g)if(l=b[u]||(b[u]={}),k=l[b.uniqueID]||(l[b.uniqueID]={}),e&&e===b.nodeName.toLowerCase())b=b[d]||b;else{if((j=k[f])&&j[0]===w&&j[1]===h)return m[2]=j[2];if(k[f]=m,m[2]=a(b,c,i))return!0}return!1}}function va(a){return a.length>1?function(b,c,d){var e=a.length;while(e--)if(!a[e](b,c,d))return!1;return!0}:a[0]}function wa(a,b,c){for(var d=0,e=b.length;d<e;d++)ha(a,b[d],c);return c}function xa(a,b,c,d,e){for(var f,g=[],h=0,i=a.length,j=null!=b;h<i;h++)(f=a[h])&&(c&&!c(f,d,e)||(g.push(f),j&&b.push(h)));return g}function ya(a,b,c,d,e,f){return d&&!d[u]&&(d=ya(d)),e&&!e[u]&&(e=ya(e,f)),ja(function(f,g,h,i){var j,k,l,m=[],n=[],o=g.length,p=f||wa(b||"*",h.nodeType?[h]:h,[]),q=!a||!f&&b?p:xa(p,m,a,h,i),r=c?e||(f?a:o||d)?[]:g:q;if(c&&c(q,r,h,i),d){j=xa(r,n),d(j,[],h,i),k=j.length;while(k--)(l=j[k])&&(r[n[k]]=!(q[n[k]]=l))}if(f){if(e||a){if(e){j=[],k=r.length;while(k--)(l=r[k])&&j.push(q[k]=l);e(null,r=[],j,i)}k=r.length;while(k--)(l=r[k])&&(j=e?J(f,l):m[k])>-1&&(f[j]=!(g[j]=l))}}else r=xa(r===g?r.splice(o,r.length):r),e?e(null,g,r,i):H.apply(g,r)})}function za(a){for(var b,c,e,f=a.length,g=d.relative[a[0].type],h=g||d.relative[" "],i=g?1:0,k=ua(function(a){return a===b},h,!0),l=ua(function(a){return J(b,a)>-1},h,!0),m=[function(a,c,d){var e=!g&&(d||c!==j)||((b=c).nodeType?k(a,c,d):l(a,c,d));return b=null,e}];i<f;i++)if(c=d.relative[a[i].type])m=[ua(va(m),c)];else{if(c=d.filter[a[i].type].apply(null,a[i].matches),c[u]){for(e=++i;e<f;e++)if(d.relative[a[e].type])break;return ya(i>1&&va(m),i>1&&ta(a.slice(0,i-1).concat({value:" "===a[i-2].type?"*":""})).replace(Q,"$1"),c,i<e&&za(a.slice(i,e)),e<f&&za(a=a.slice(e)),e<f&&ta(a))}m.push(c)}return va(m)}function Aa(a,b){var c=b.length>0,e=a.length>0,f=function(f,g,h,i,k){var l,o,q,r=0,s="0",t=f&&[],u=[],v=j,x=f||e&&d.find.TAG("*",k),y=w+=null==v?1:Math.random()||.1,z=x.length;for(k&&(j=g===n||g||k);s!==z&&null!=(l=x[s]);s++){if(e&&l){o=0,g||l.ownerDocument===n||(m(l),h=!p);while(q=a[o++])if(q(l,g||n,h)){i.push(l);break}k&&(w=y)}c&&((l=!q&&l)&&r--,f&&t.push(l))}if(r+=s,c&&s!==r){o=0;while(q=b[o++])q(t,u,g,h);if(f){if(r>0)while(s--)t[s]||u[s]||(u[s]=F.call(i));u=xa(u)}H.apply(i,u),k&&!f&&u.length>0&&r+b.length>1&&ha.uniqueSort(i)}return k&&(w=y,j=v),t};return c?ja(f):f}h=ha.compile=function(a,b){var c,d=[],e=[],f=A[a+" "];if(!f){b||(b=g(a)),c=b.length;while(c--)f=za(b[c]),f[u]?d.push(f):e.push(f);f=A(a,Aa(e,d)),f.selector=a}return f},i=ha.select=function(a,b,c,e){var f,i,j,k,l,m="function"==typeof a&&a,n=!e&&g(a=m.selector||a);if(c=c||[],1===n.length){if(i=n[0]=n[0].slice(0),i.length>2&&"ID"===(j=i[0]).type&&9===b.nodeType&&p&&d.relative[i[1].type]){if(b=(d.find.ID(j.matches[0].replace(aa,ba),b)||[])[0],!b)return c;m&&(b=b.parentNode),a=a.slice(i.shift().value.length)}f=W.needsContext.test(a)?0:i.length;while(f--){if(j=i[f],d.relative[k=j.type])break;if((l=d.find[k])&&(e=l(j.matches[0].replace(aa,ba),_.test(i[0].type)&&ra(b.parentNode)||b))){if(i.splice(f,1),a=e.length&&ta(i),!a)return H.apply(c,e),c;break}}}return(m||h(a,n))(e,b,!p,c,!b||_.test(a)&&ra(b.parentNode)||b),c},c.sortStable=u.split("").sort(C).join("")===u,c.detectDuplicates=!!l,m(),c.sortDetached=ka(function(a){return 1&a.compareDocumentPosition(n.createElement("fieldset"))}),ka(function(a){return a.innerHTML="<a href='#'></a>","#"===a.firstChild.getAttribute("href")})||la("type|href|height|width",function(a,b,c){if(!c)return a.getAttribute(b,"type"===b.toLowerCase()?1:2)}),c.attributes&&ka(function(a){return a.innerHTML="<input/>",a.firstChild.setAttribute("value",""),""===a.firstChild.getAttribute("value")})||la("value",function(a,b,c){if(!c&&"input"===a.nodeName.toLowerCase())return a.defaultValue}),ka(function(a){return null==a.getAttribute("disabled")})||la(K,function(a,b,c){var d;if(!c)return a[b]===!0?b.toLowerCase():(d=a.getAttributeNode(b))&&d.specified?d.value:null});var Ba=a.Sizzle;ha.noConflict=function(){return a.Sizzle===ha&&(a.Sizzle=Ba),ha},"function"==typeof define&&define.amd?define(function(){return ha}):"undefined"!=typeof module&&module.exports?module.exports=ha:a.Sizzle=ha}(window);

	// a slim jQuery like object
	var Junior = function() {
		var coll = Object.create(Array.prototype);
		for (var prop in Junior.prototype) {
			if (Junior.prototype.hasOwnProperty(prop)) {
				coll[prop] = Junior.prototype[prop];
			}
		}
		return coll;
	};

	Junior.prototype = {
		find: function(selector, context) {
			var found = [],
				i, il;
			context = context || document;

			if (selector.constructor === Array) {
				found = selector;
				// if (!found.length) {
				// 	Array.prototype.push.call(this, found);
				// 	return this;
				// }
			} else if (selector.nodeType || selector === window) {
				found = [selector];
			} else {
				if (this.length) {
					if (this[0] === window) context = document;
					else {
						this.map(function(el) {
							found = found.concat(Sizzle(selector, el));
						});
						return jr(found);
					}
				}
				found = Sizzle(selector, context);
			}
			if (this.length > 0) return jr(found);
			// populate 'this'
			for (i=0, il=found.length; i<il; i++) {
				Array.prototype.push.call(this, found[i]);
			}
			return this;
		},
		map: function(callback) {
			return this.toArray().map(callback);
		},
		filter: function(callback) {
			var matches = this.toArray().filter(callback);
			return jr(matches);
		},
		each: function(callback) {
			return this.map(callback);
		},
		toggleClass: function(name, state) {
			return this[state ? 'removeClass' : 'addClass'](name);
		},
		is: function(qualifier) {
			return this[0].matches(qualifier);
		},
		get: function(index) {
			var match = this.toArray();
			if (index !== undefined) {
				match = match[ index >= 0 ? index : match.length - index - 2 ];
			}
			return jr(match);
		},
		toArray: function() {
			return [].slice.call( this );
		},
		width: function() {
			return this[0] === window ? this[0].innerWidth : this[0].offsetWidth;
		},
		height: function() {
			return this[0] === window ? this[0].innerHeight : this[0].offsetHeight;
		},
		offset: function() {
			return { top: this[0].offsetTop, left: this[0].offsetLeft };
		},
		eq: function(i) {
			return jr(this[i]);
		},
		nth: function(i) {
			return jr(this[i]);
		},
		index: function() {
			var i=0, el;
			if (!this.length || this[0].nodeType === 3) return;
			el = this[0];
			while (el.previousSibling) {
				el = el.previousSibling;
				if (el.nodeType !== 3) i += 1;
			}
			return i;
		},
		hide: function() {
			for (var i=0, il=this.length; i<il; i++) {
				this[i].style.display = 'none';
			}
			return this;
		},
		show: function() {
			for (var i=0, il=this.length; i<il; i++) {
				this[i].style.display = '';
			}
			return this;
		},
		cssSequence: function(name, type, callback) {
			let fn = event => {
					callback(jr(event.target));
					event.target.removeEventListener(type, fn);
				};
			// apply to all elements
			this.map(el => el.addEventListener(type, fn));
			// trigger animation / transition
			this.addClass(name);
			return this;
		},
		hasClass: function(name) {
			return this.length ? this[0].matches('.'+ name) : false;
		},
		addClass: function(names) {
			var classes = names.split(" ");
			for (var i=0, il=this.length; i<il; i++) {
				classes.map(name => this[i].classList.add(name));
			}
			return this;
		},
		removeClass: function(names) {
			var classes = names.split(" ");
			for (var i=0, il=this.length; i<il; i++) {
				classes.map(name => this[i].classList.remove(name));
			}
			return this;
		},
		css: function(name, value) {
			for (var i=0, il=this.length, fixedName; i<il; i++) {
				if (value) {
					fixedName = fixStyleName(name);
				} else {
					switch (typeof (name)) {
						case 'string':
							return getStyle(this[i], name);
						case 'object':
							for (var key in name) {
								fixedName = fixStyleName(key);
								this[i].style[fixedName] = name[key];
							}
							break;
					}
				}
			}
			return this;
		},
		val: function(str, el) {
			if (!str && str !== '') {
				return this.length ? this[0].value : '';
			}
			for (var i = 0, il = this.length; i < il; i++) {
				this[i].value = str;
			}
			return this;
		},
		text: function(str, el) {
			if (!str && str !== '') {
				return this.length ? this[0].textContent : '';
			}
			for (var i = 0, il = this.length; i < il; i++) {
				this[i].textContent = str;
			}
			return this;
		},
		html: function(str, el) {
			if (!str && str !== '') {
				return this.length ? this[0].innerHTML : '';
			}
			for (var i = 0, il = this.length; i < il; i++) {
				this[i].innerHTML = str;
			}
			return this;
		},
		removeAttr: function(name, value) {
			var arr = this,
				key;
			for (var i=0, il=arr.length; i<il; i++) {
				arr[i].removeAttribute(name);
			}
			return this;
		},
		data: function(name, value) {
			switch (name.constructor) {
				case String: return this.attr("data-"+ name);
				case Object: return this.attr(name, null, "data-");
			}
			return this.attr(name, value, "data-");
		},
		attr: function(name, value, prefix) {
			var arr = this,
				key;
			
			prefix = prefix || "";

			for (var i=0, il=arr.length; i<il; i++) {
				if (!value) {
					switch (typeof (name)) {
						case 'string':
							return arr[i].getAttribute(name);
						case 'object':
							for (key in name) {
								arr[i].setAttribute(prefix + key, name[key]);
							}
							break;
					}
				} else if (name && value) {
					arr[i].setAttribute(prefix + name, value);
				}
			}
			return this;
		},
		cssProp: function(name) {
			return getComputedStyle(this[0]).getPropertyValue(name);
		},
		prop: function(name, value, el) {
			var fix = { 'class': 'className' },
				arr = (el) ? [el] : this,
				key;
			for (var i=0, il=arr.length; i<il; i++) {
				if (!value) {
					switch (typeof (name)) {
						case 'string':
							name = fix[name] || name;
							return arr[i][name];
						case 'object':
							for (key in name) {
								arr[i][key] = name[key];
							}
							break;
					}
				} else if (name && value) {
					name = fix[name] || name;
					arr[i][name] = value;
				}
			}
			return arr;
		},
		nodeName: function() {
			return this.length ? this[0].nodeName.toLowerCase() : undefined;
		},
		parent: function() {
			return this.parents();
		},
		parents: function(selector) {
			var found = [],
				el,
				isFirst = selector && selector.slice(-6) === ':first';

			selector = selector || '*';
			selector = isFirst ? selector.slice(0,-6) : selector;

			// if (this[0].matches(selector)) {
			// 	found.push(this[0]);
			// }

			for (var i=0, il=this.length; i<il; i++) {
				el = this[i].parentNode;
				while (el.nodeType !== 9) {
					if (el.matches(selector)) {
						found.push(el);
						break;
					}
					el = el.parentNode;
				}
			}
			if (isFirst && found.length) found = found[0];
			return jr(found);
		},
		clone: function(deep) {
			var cloned = [];
			for (var i=0, il=this.length; i<il; i++) {
				cloned.push(this[i].cloneNode(deep));
			}
			return jr(cloned);
			//return this.length ? this[0].cloneNode(deep) : false;
		},
		insert: function(type, source, el) {
			var arr = (el)? [el] : this,
				new_arr = [],
				isStr = typeof(source) === 'string',
				div = document.createElement('div'),
				moveEl,
				movedEl,
				moveAccNr;
			if (isStr) div.innerHTML = source;
			else if (source.constructor === Array) {
				source.map(item => div.appendChild(item));
				isStr = true;
			} else {
				source = source.nodeType ? source : source[0];
				div.appendChild(div.cloneNode(false));
			}
			for (var i=0, il=arr.length; i<il; i++) {
				for (var j=0, jl=div.childNodes.length; j<jl; j++) {
					moveEl = isStr ? div.childNodes[j].cloneNode(true) : source ;
					moveAccNr = moveEl[system.id];
					switch (type) {
						case 'before':
							if (isAdjacentSibling(arr[i], moveEl) === -1) continue;
							movedEl = arr[i].parentNode.insertBefore(moveEl, arr[i]);
							break;
						case 'after':
							if (isAdjacentSibling(arr[i], moveEl) === 1) continue;
							movedEl = arr[i].parentNode.insertBefore(moveEl, arr[i].nextSibling);
							break;
						case 'append':
							movedEl = arr[i].appendChild(moveEl);
							break;
						case 'prepend':
							movedEl = arr[i].insertBefore(moveEl, arr[i].firstChild);
							break;
					}
					movedEl[system.id] = moveAccNr;
					new_arr.push(movedEl);
				}
			}
			//important to return new instance of junior along with appended element
			return jr(new_arr);
		},
		before: function(str, el) {
			return this.insert('before', str, el);
		},
		after: function(str, el) {
			return this.insert('after', str, el);
		},
		prepend: function(str, el) {
			return this.insert('prepend', str, el);
		},
		append: function(str, el) {
			return this.insert('append', str, el);
		},
		focus: function() {
			this[0].focus();
			return this;
		},
		blur: function() {
			this[0].blur();
			return this;
		},
		select: function() {
			this[0].focus();
			this[0].select();
			return this;
		},
		remove: function(el) {
			var arr = (el)? [el] : this;
			for (var i=0, il=arr.length; i<il; i++) {
				arr[i].parentNode.removeChild(arr[i]);
			}
			return this;
		},
		replace: function(str) {
			this.after(str);
			this.remove();
		},
		nextPrev: function(selector, direction, keepThis, once) {
			var found = [],
				el,
				isFirst = selector && selector.slice(-6) === ':first';
			
			selector = selector || '*';
			selector = isFirst ? selector.slice(0,-6) : selector;

			if (keepThis) {
				for (var i=0, il=this.length; i<il; i++) {
					found.push(this[i]);
				}
			}

			for (var i=0, il=this.length; i<il; i++) {
				el = this[i];
				while (el) {
					el = el[direction];
					if (!el) break;
					if (el.nodeType === 1 && el.matches(selector)) {
						found.push(el);
					}
					if (once) break;
				}
			}
			if (isFirst && found.length) found = found[0];
			return jr(found);
		},
		next: function(selector, keepThis) {
			return this.nextPrev(selector, 'nextSibling', keepThis, true);
		},
		prev: function(selector, keepThis) {
			return this.nextPrev(selector, 'previousSibling', keepThis, true);
		},
		nextAll: function(selector, keepThis) {
			return this.nextPrev(selector, 'nextSibling', keepThis);
		},
		prevAll: function(selector, keepThis) {
			return this.nextPrev(selector, 'previousSibling', keepThis);
		},
		on: function(types, selector, callback) {
			callback = (typeof selector === 'function') ? selector : callback;
			selector = (typeof selector === 'string') ? selector : false;
			for (var i=0, il=this.length; i<il; i++) {
				system.eventManager.addEvent(this[i], types, callback, selector);
			}
			return this;
		},
		off: function(types, selector, callback) {
			callback = (typeof selector === 'function') ? selector : callback;
			selector = (typeof selector === 'string') ? selector : false;
			for (var i=0, il=this.length; i<il; i++) {
				system.eventManager.removeEvent(this[i], types, callback, selector);
			}
			return this;
		},
		bind: function(types, callback) {
			return this.on(types, false, callback);
		},
		unbind: function(types, callback) {
			return this.off(types, false, callback);
		},
		scrollTop: function(y) {
			return this.scrollTo(0, y || 0);
		},
		scrollTo: function(x, y) {
			for (var i=0, il=this.length; i<il; i++) {
				this[i].scrollLeft = x;
				this[i].scrollTop = y;
			}
			return this;
		},
		trigger: function(types, el) {
			var arr = (el)? [el] : this,
				type = types.split(/\s+/),
				i=0, il=arr.length,
				j=0, jl=type.length,
				isNative, isStyle, event, listener;

			for (; j<jl; j++) {
				isNative = system.eventManager.nativeEvents.indexOf(type[j]) > -1;
				isStyle = type[j].indexOf('style.') > -1;
				if (isNative) {
					event = document.createEvent('MouseEvents');
					event.initEvent(type[j], true, true, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null);
				} else {
					event = document.createEvent('Event');
					event.initEvent(type[j], true, true);
				}
				for (; i<il; i++) {
					el = arr[i];
					if (isNative) {
						el.dispatchEvent(event);
					} else {
						while (el.nodeType === 1) {
							listener = el['on'+ type[j]];
							if (typeof(listener) === 'function') {
								if (isStyle) event.run73 = {target: el};
								listener.call(el, event);
								if (event.isBubblingCanceled) {
									break;
								}
							}
							if (isStyle) return this;
							el = el.parentNode;
						}
					}
				}
			}
			return this;
		}
	};

	// wait stack
	var wait_stack = [];
	var wait_interval = 500;
	var wait_timeout = false;

	var jr = function() {
			var new_junior = new Junior();
			return new_junior.find.apply(new_junior, arguments);
		};

	// junior auxiliary
	var auxiliary = {
		ready: function(fn) {
			if (document.readyState === 'complete') {
				fn();
			} else {
				let func = window.onload;
				window.onload = function () {
					if (typeof func === 'function') func();
					fn();
				};
			}
		},
		fetchOrg: window.fetch.bind(window),
		fetch: async function(path, options) {
			let request = await fetch(path, options),
				contentType = request.headers.get("Content-Type");
			
			switch (request.status) {
				case 400:
				case 401:
				case 403:
				case 404:
					return { error: request.status };
			}

			switch (contentType.split(";")[0]) {
				case "audio/midi":
					return request;
				case "text/markdown":
					return await request.text();
				case "application/javascript":
					console.log("TODO");
					break;
				case "application/json":
					return request.json();
				case "application/xml":
					let text = await request.text();
					return this.xmlFromString(text);
				default:
					let reader = request.body.getReader(),
						size = request.headers.get("Content-Length");

					return { path, size, reader, status: request.status };
			}
		},
		getScript: function(url, callback) {
			var script = document.createElement('script'),
				head = document.head || document.documentElement;
			script.async = true;
			script.src = url;
			script.onload = script.onreadystatechange = function() {
				if (!script.readyState || /loaded|complete/.test(script.readyState)) {
					callback();
				}
			};
			head.insertBefore(script, head.firstChild);
		},
		grep: function(list, callback) {
			var matches = [];
			list.toArray().map(function(el, index) {
				if (callback(el, index)) matches.push(el);
			});
			return matches;
		},
		extend: function(safe, deposit) {
			var content;
			for (content in deposit) {
				if (!safe[content] || typeof(deposit[content]) !== 'object') {
					safe[content] = deposit[content];
				} else {
					this.extend(safe[content], deposit[content]);
				}
			}
			return safe;
		},
		// wait for element or variable
		wait_for: function(what, callback) {
			wait_stack.push({
				type: what.slice(0,7) === 'window.' ? 'variable' : 'selector',
				require: what,
				callback: callback
			});
			wait_flush();
		},
		flush: function(win, app) {
			system.eventManager.flushHandlers(win.el[0]);
			if (app.dispatch) system.bank.clearbyHandler(app.dispatch);
		},
		cookie: {
			remove: function(name) {
				this.set(name, '', -1);
			},
			get: function(name) {
				var v = document.cookie.match('(^|;) ?' + name + '=([^;]*)(;|$)');
				return v ? v[2] : null;
			},
			set: function(name, value, days) {
				var d = new Date;
				d.setTime(d.getTime() + 24*60*60*1000*(days || 1));
				document.cookie = name + "=" + value + ";path=/;expires=" + d.toGMTString();
			}
		},
		history: {
			doPush: true,
			pop: function(state) {
				this.doPush = false;
				this.doPush = true;
			},
			push: function(state) {
				if (!this.doPush || JSON.stringify(state) === JSON.stringify(history.state)) return;
				var qryString = poc.history.serialize(state),
					url = document.location.pathname;
				if (qryString) url += '?'+ qryString;
				history.pushState(state, null, url);
			},
			serialize: function(obj) {
				var str = [];
				for (var p in obj) {
					if (obj.hasOwnProperty(p)) {
						str.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
					}
				}
				return str.join("&");
			},
			unserialize: function(url) {
				var str = url.indexOf('?') === 0 ? url.slice(1) : url,
					params = str.split('&'),
					i = 0, il = params.length,
					ret = {},
					parts,
					val;

				for (; i<il; i++) {
					parts = params[i].split('=');
					if (!parts[0]) continue;
					val = decodeURIComponent(parts[1]);

					switch (val) {
						case ('true' || 'false'):
							val = val === 'true';
							break;
						default:
							if (val === (+val).toString()) val = +val;
					}

					ret[decodeURIComponent(parts[0])] = val;
				}
				return JSON.stringify(ret) === '{}' ? false : ret;
		  }
		},
		xmlFromString: function(str) {
			var parser = new DOMParser();
			return parser.parseFromString(str, 'text/xml');
		},
		prettyPrint: function(node) {
			var decl   = '<?xml version="1.0" encoding="utf-8"?>',
				ser    = new XMLSerializer(),
				xstr   = ser.serializeToString(node),
				str    = xstr.trim().replace(/(>)\s*(<)(\/*)/g, '$1\n$2$3'),
				lines  = str.split('\n'),
				indent = -1,
				tabs   = 4,
				i      = 0,
				il     = lines.length,
				start,
				end;
			for (; i<il; i++) {
				if (i === 0 && lines[i].toLowerCase() === decl) continue;
				start = lines[i].match(/<[A-Za-z\:_]+.*?>/g) !== null;
				//start = lines[i].match(/<[^\/]+>/g) !== null;
				end   = lines[i].match(/<\/[\w\:]+>/g) !== null;
				if (lines[i].match(/<.*?\/>/g) !== null) start = end = true;
				if (start) indent++;
				lines[i] = String().fill(indent, '\t') + lines[i];
				if (start && end) indent--;
				if (!start && end) indent--;
			}
			return lines.join('\n').replace(/\t/g, String().fill(tabs, ' '));
		}
	};

	// wait for mechanism
	function wait_flush() {
		var item,
			search,
			callback,
			i = 0,
			il = wait_stack.length,
			parts, j, jl;
		for (; i<il; i++) {
			if (wait_stack[i]) {
				switch (wait_stack[i].type) {
					case 'selector':
						item = document.querySelectorAll(wait_stack[i].require);
						if (!item.length) continue;
						break;
					case 'variable':
						search = window;
						parts = wait_stack[i].require.split('.');
						for (j=1, jl=parts.length; j<jl; j++) {
							if (!search[parts[j]]) {
								search = false;
								break;
							}
							search = search[parts[j]];
						}
						item = search;
						if (!search) continue;
						break;
				}
				callback = wait_stack[i].callback;
			}
			wait_stack.splice(i-1, 1);
			callback(item);
		}
		clearTimeout(wait_timeout);
		if (wait_stack.length && wait_stack.length < 10) {
			wait_timeout = setTimeout(wait_flush, wait_interval);
		}
	};

	// private system stuff
	var system = {
		id: 'jr-'+ Date.now(),
		init: function() {
			this.eventManager.init();
		},
		bank: {
			guid: 0,
			vault: {},
			flushAll: function(el) {
				if (!el) return;
				var id = el[system.id];
				delete this.vault[id];
				delete el[system.id];
			},
			empty: function(el, name, selector) {
				var id = el[system.id],
					safe = this.vault[id],
					content = safe ? safe[name] : el.dataset[name];
				if (safe) {
					delete safe[name];
				}
				el.removeAttribute('data-' + name);
				return content;
			},
			balance: function(el, name) {
				var id = el[system.id],
					safe = this.vault[id];
				return safe ? safe[name] : {};
			},
			deposit: function(el, name, value) {
				var id = el[system.id] = el[system.id] || ++this.guid,
					safe = this.vault[id] = this.vault[id] || {}, content, key;
				if (typeof (name) === 'object') {
					system.extend(safe, name);
				} else {
					safe[name] = value;
				}
			},
			clearbyHandler: function(handler) {
				for (let key in this.vault) {
					for (let safe in this.vault[key]) {
						let locker = this.vault[key][safe];
						for (let event in locker) {
							for (let item in locker[event]) {
								if (locker[event][item].handler === handler) {
									delete locker[event];
								}
							}
						}
					}
				}
			}
		},
		eventManager: {
			init: function() {
				this.guid = 1;
				this.nativeEvents = 'blur focus focusin focusout load resize scroll unload click dblclick '+
									'touchstart touchmove touchend '+
									'mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave '+
									'change select submit keydown keypress keyup error contextmenu'.split(' ');
			},
			flushHandlers: function(e) {
				var elem = (e.nodeType) ? e : e.target;
				if (!elem.getElementsByTagName) return;
				var children = elem.getElementsByTagName('*'),
					sysId = system.id,
					i = 0,
					il = children.length;
				for (; i < il; i++) {
					this.removeEvent(children[i]);
					system.bank.flushAll(children[i]);
					delete children[i][sysId];
				}
				system.bank.flushAll(elem[sysId]);
				delete elem[sysId];
				this.removeEvent(elem);
			},
			addEvent: function(elem, types, handler, selector) {
				var type = types.split(/\s+/),
					i = 0,
					il = type.length,
					obj, guid;
				
				handler._guid = handler._guid || ++this.guid;
				obj = {};
				for (; i < il; i++) {
					guid = ++this.guid;
					obj[type[i]] = {};
					obj[type[i]][guid] = {
						guid: guid,
						handler: handler,
						selector: selector
					};
				}
				system.bank.deposit(elem, {
					events: obj
				});
				for (i=0; i<il; i++) {
					if (elem['on' + type[i]] && elem['on' + type[i]] !== this.handleEvent) {
						obj[type[i]][0] = {
							handler: elem['on' + type[i]]
						};
						system.bank.deposit(elem, {
							events: obj
						});
					}
					elem.addEventListener(type[i], this.handleEvent, false);
				}
			},
			removeEvent: function(elem, types, handler, selector) {
				if (arguments.length === 1) {
					system.bank.flushAll(elem);
					return;
				}
				var type = types.split(/\s+/),
					i = 0,
					il = type.length,
					vault = system.bank.vault,
					shelf,
					safe,
					key,
					content;

				if (types && handler) {
					shelf = vault[elem[system.id]];
					for (; i<il; i++) {
						safe = shelf.events[type[i]];
						for (key in safe) {
							content = safe[key];
							if (content.handler._guid === handler._guid && content.selector === selector) {
								delete safe[key];
								break;
							}
						}
						elem.removeEventListener(type[i], this.handleEvent, false);
					}
					//delete vault[elem[system.id]];
				}
			},
			handleEvent: function(event) {
				var returnValue = true,
					type = event.type,
					target = event.target,
					handlers = system.bank.balance(this, 'events'),
					_handlers,
					_name,
					_eventHandler,
					_handleSelector;

				if (!handlers) return returnValue;
				_handlers = handlers[type];
				event.stopPropagation = function() {
					this.isBubblingCanceled = true;
				};
				while (target !== null && target !== this) {
					for (_name in _handlers) {
						_eventHandler = _handlers[_name];
						_handleSelector = _eventHandler.selector;
						if (_handleSelector && target.matches(_handleSelector)) {
							if (_eventHandler.handler.call(target, event) === false) {
								returnValue = false;
							}
							if (event.isBubblingCanceled) {
								return returnValue;
							}
						}
					}
					target = target.parentNode;
				}
				if (!event.isBubblingCanceled) {
					for (_name in _handlers) {
						_eventHandler = _handlers[_name];
						if (_eventHandler.selector) continue;
						if (_eventHandler.handler.call(this, event) === false) {
							returnValue = false;
						}
					}
				}
				return returnValue;
			}
		},
		extend: function(safe, deposit) {
			for (var content in deposit) {
				if (!safe[content] || typeof (deposit[content]) !== 'object') {
					safe[content] = deposit[content];
				} else {
					this.extend(safe[content], deposit[content]);
				}
			}
			return safe;
		}
	},
	// auxillary functions
	getStyle = function(el, name) {
		name = name.replace(/([A-Z]|^ms)/g, "-$1").toLowerCase();
		var value = document.defaultView.getComputedStyle(el, null).getPropertyValue(name);
		if (name === 'opacity') {
			if (getStyle(el, 'display') === 'none') {
				el.style.display = 'block';
				el.style.opacity = '0';
				value = '0';
			}
		}
		if (value === 'auto') {
			switch (name) {
				case 'top':    value = el.offsetTop; break;
				case 'left':   value = el.offsetLeft; break;
				case 'width':  value = el.offsetWidth; break;
				case 'height': value = el.offsetHeight; break;
			}
		}
		return value;
	},
	fixStyleName = function(name) {
		return name.replace(/-([a-z]|[0-9])/ig, function(m, letter) {
			return (letter + "").toUpperCase();
		});
	},
	isAdjacentSibling = function(el1, el2) {
		var currParentEl = el1.parentNode,
			currEl = el1,
			isAdjacent = false;
		if (!currParentEl || !el2.parentNode) return isAdjacent;
		while (!isAdjacent && currEl && currParentEl.firstChild !== currEl) {
			currEl = currEl.previousSibling;
			if (currEl.nodeType === 3) continue;
			if (currEl === el2) isAdjacent = -1;
			break;
		}
		currEl = el1;
		while (!isAdjacent && currEl && currParentEl.lastChild !== currEl) {
			currEl = currEl.nextSibling;
			if (currEl.nodeType === 3) continue;
			if (currEl === el2) isAdjacent = 1;
			break;
		}
		return isAdjacent;
	};

	if (!Element.prototype.matches) {
		Element.prototype.matches = 
			Element.prototype.matchesSelector || 
			Element.prototype.mozMatchesSelector ||
			Element.prototype.msMatchesSelector || 
			Element.prototype.oMatchesSelector || 
			Element.prototype.webkitMatchesSelector ||
			function(s) {
				var matches = (this.document || this.ownerDocument).querySelectorAll(s),
					i = matches.length;
				while (--i >= 0 && matches.item(i) !== this) {}
				return i > -1;            
			};
	}

	// inititate system object
	system.init();

	// extending Object (backwards compatibility)
	if (typeof Object.create !== 'function') {
		Object.create = function(o, props) {
			function F() {}
			F.prototype = o;
			if (typeof(props) === 'object') {
				for (var prop in props) {
					if (props.hasOwnProperty((prop))) {
						F[prop] = props[prop];
					}
				}
			}
			return new F();
		};
	}
	// extending Array
	if (!Array.prototype.hasOwnProperty('removeDuplicates')) {
		Array.prototype.removeDuplicates = function() {
			for (var i=0, il=this.length, unique=[]; i<il; i++) {
				if (unique.indexOf(this[i]) === -1) {
					unique.push(this[i]);
				}
			}
			return unique;
		};
	}
	if (!Array.prototype.hasOwnProperty('difference')) {
		Array.prototype.difference = function(a) {
			return this.filter(function(i) {return (a.indexOf(i) === -1);});
		};
	}
	if (!Array.prototype.hasOwnProperty('shuffle')) {
		Array.prototype.shuffle = function() {
			let i = this.length,
				j,
				temp;
			if (i === 0) return this;
			while (--i) {
				j = Math.floor(Math.random() * (i + 1));
				temp = this[i]; this[i] = this[j]; this[j] = temp;
			}
			return this;
		}
	}
	// extending String
	if (!String.prototype.stripHtml) {
		String.prototype.stripHtml = function() {
			return this.replace(/<[^>]+>/g, '');
		};
	}
	if (!String.prototype.trim) {
		String.prototype.trim = function() {
			return this.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
		};
	}
	if (!String.prototype.fill) {
		String.prototype.fill = function(i,c) {
			var str = this;
			c = c || ' ';
			for (; str.length<i; str+=c){}
			return str;
		};
	}
	if (!String.prototype.padStart) {
		String.prototype.padStart = function(str, length) {
			var s = this;
			while (s.length < length) s = str + s;
			return s;
		}
	}
	// extending the XML object
	Document.prototype.selectNodes = function(xpath, xnode) {
		if (!xnode) xnode = this;
		var ns = this.createNSResolver(this.documentElement),
			qI = this.evaluate(xpath, xnode, ns, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null),
			res = [],
			len = qI.snapshotLength;
		while (len--) res[len] = qI.snapshotItem(len);
		return res;
	};
	Document.prototype.selectSingleNode = function(xpath, xnode) {
		if(!xnode) xnode = this;
		var xI = this.selectNodes(xpath, xnode);
		return (xI.length > 0)? xI[0] : null ;
	};
	Element.prototype.selectNodes = function(xpath) {
		return this.ownerDocument.selectNodes(xpath, this);
	};
	Element.prototype.selectSingleNode = function(xpath) {
		return this.ownerDocument.selectSingleNode(xpath, this);
	};
	Node.prototype.__defineGetter__('xml', function() {
		var ser    = new XMLSerializer(),
			xstr   = ser.serializeToString(this),
			str    = xstr.trim().replace(/(>)\s*(<)(\/*)/g, '$1\n$2$3'),
			lines  = str.split('\n'),
			indent = -1,
			i      = 0,
			il     = lines.length,
			start,
			end;
		for (; i<il; i++) {
			if (i === 0 && lines[i].toLowerCase() === '<?xml version="1.0" encoding="utf-8"?>') continue;
			start = lines[i].match(/<[A-Za-z\:_]+.*?>/g) !== null;
			end   = lines[i].match(/<\/[\w\:]+>/g) !== null;
			if (lines[i].match(/<.*?\/>/g) !== null) start = end = true;
			if (start) indent++;
			lines[i] = String().fill(indent, '\t') + lines[i];
			if (start && end) indent--;
			if (!start && end) indent--;
		}
		return lines.join('\n').replace(/\t/g, String().fill(4, ' '));
	});

	NodeList.prototype.map = Array.prototype.map
	NodeList.prototype.filter = Array.prototype.filter
	
	for (var fn in auxiliary) {
		jr[fn] = auxiliary[fn];
	}

	return jr;

})(window, document);

	// private event stack
	const observerStack = {};

	// include classes
	
class Window_ {
	constructor(entity, bluePrint) {
		let fs = defiant_.fileSystem_;

		this.AudioContext = window.AudioContext || window.webkitAudioContext;
		this.fetch = $.fetchOrg;
		this.location = {
			origin: window.location.origin
		};

		this.entity = entity;
		this.el = entity.win.el;
		this.body = this.el.find(".win-body_");
		this.statusBar = this.el.find(".win-status-bar_");
		this.updateDim();

		let xTitle = bluePrint.selectSingleNode(".//Head/meta[@name='title']");
		if (xTitle) this.xTitle = xTitle.getAttribute("value");
		
		this.id = this.el.attr("data-id");
		this.bluePrint = bluePrint;
		this.storage = {
			getItem: (key) => defiant_.localStorage_.getItem_(this.id +":"+ key),
			setItem: (key, value) => defiant_.localStorage_.setItem_(this.id +":"+ key, value),
			removeItem: (key) => defiant_.localStorage_.removeItem_(this.id +":"+ key)
		};

		this.path = {
			join: fs.path_.join_.bind(fs.path_),
			isDirectory: fs.path_.isDirectory_.bind(fs.path_),
			exists: fs.path_.exists_.bind(fs.path_),
		};

		if (this.id !== "login") {
			this.minW = +bluePrint.selectSingleNode(".//meta[@name='width']").getAttribute("min");
			this.minH = +bluePrint.selectSingleNode(".//meta[@name='height']").getAttribute("min");
		}

		defiant_.on_(`GUI.Update.${this.id}`, this.updateDim.bind(this));

		// semi deep-freeze
		["path", "storage", "bluePrint"].map(key => Object.freeze(this[key]));
	}
	updateDim() {
		this.y = this.el[0].offsetTop;
		this.x = this.el[0].offsetLeft;
		this.w = this.el[0].offsetWidth;
		this.h = this.el[0].offsetHeight;
	}
	settings(name, value) {
		let item = this.bluePrint.selectSingleNode(`.//Settings//*[@id="${name}"]`);
		if (item === null) return;

		if (value) item.setAttribute("value", value);
		else {
			value = item.getAttribute("value");
			return value || item.selectNodes("./*");
		}
	}
	render(options) {
		options.template = this.id +"-"+ options.template;
		if (options.path) {
			options.match = defiant_.fileSystem_.path_.toXpath_(options.path);
		}
		if (options.match && options.match.slice(0,1) === "~") {
			options.match = '//Application[.//meta/@name="id" and .//meta/@value="Finder"]'+ options.match.slice(1);
		}
		return defiant_.manager_.render_(options);
	}
	requestAnimationFrame(fn) {
		window.requestAnimationFrame(fn);
	}
	close() {
		defiant_.window_.close_(this.id);
	}
	state(what, value) {
		let el;
		switch (what) {
			case "sidebar":
				el = this.el.find("sidebar:first");
				if (arguments.length === 2) el.toggleClass("hidden", !!value);
				else return el.hasClass("hidden");
				break;
			case "toolbar":
				if (arguments.length === 2) this.el.toggleClass("has-ToolBar_", !!value);
				else return this.el.hasClass("has-ToolBar_");
				break;
			case "statusbar":
				if (arguments.length === 2) this.el.toggleClass("has-StatusBar_", !!value);
				else return this.el.hasClass("has-StatusBar_");
				break;
		}
	}
	updateMenu(what, params) {
		defiant_.menu_.updateItem_(this.id, what, params);
	}
	updateTitle(params) {
		defiant_.window_.updateTitle_(this.id, params);
	}
	on(event, callback) {
		return defiant_.on_(event, callback, this.id);
	}
	find(selector) {
		return this.el.find(selector, this.el);
	}
	setInterval(fn, timer) {
		return setInterval(fn.bind(this.entity.app), timer);
	}
	setTimeout(fn, timer) {
		return setTimeout(fn.bind(this.entity.app), timer);
	}
	get title() {
		return this.xTitle || "";
	}
	set title(value) {
		this.el.find(".win-caption-title_ .caption-title-span_").html(value);
		this.xTitle = value;
	}
	get width() {
		let value = typeof this.w === "string" ? this.el.prop("offsetWidth") : this.w;
		return value;
	}
	set width(value) {
		value = typeof value === "string" ? value : value + "px";
		this.w = value;
		this.el.find(".win-body_").css({"width": value});
	}
	get minWidth() {
		return this.minW;
	}
	get height() {
		let value = typeof this.h === "string" ? this.el.prop("offsetHeight") : this.h;
		return value;
	}
	set height(value) {
		value = typeof value === "string" ? value : value + "px";
		this.h = value;
		this.el.find(".win-body_").css({"height": value});
	}
	get minHeight() {
		return this.minH;
	}
	get top() {
		return this.y;
	}
	set top(value) {
		this.y = value;
		this.el.find(".win-body_").css({"top": value +"px"});
	}
	get left() {
		return this.x;
	}
	set left(value) {
		this.x = value;
		this.el.find(".win-body_").css({"left": value +"px"});
	}
}

	
// https://devhints.io/moment

const months = "January,February,March,April,May,June,July,August,September,October,November,December".split(",");
const days = "Sunday,Monday,Tuesday,Wednesday,Thursday,Friday,Saturday".split(",");

class Moment {
	constructor(value) {
		this.date = new Date(value || Date.now());
		this.timestamp = this.date;
	}
	format(str) {
		return str.replace(/\w+/g, (match) => {
			switch (match) {
				case "YYYY":
					return this.date.getFullYear();
				case "YY":
					return this.date.getYear();
				case "dddd":
					return days[this.date.getDay()];
				case "ddd":
					return days[this.date.getDay()].slice(0,3);
				case "DD":
					return this.date.getDate().toString().padStart(2, "0");
				case "D":
					return this.date.getDate();
				case "MMMM":
					return months[this.date.getMonth()];
				case "MMM":
					return months[this.date.getMonth()].slice(0,3);
				case "MM":
					return this.date.getMonth().toString().padStart(2, "0");
				case "HH":
					return this.date.getHours().toString().padStart(2, "0");
				case "H":
					return this.date.getHours().toString();
				case "mm":
					return this.date.getMinutes().toString().padStart(2, "0");
				case "m":
					return this.date.getMinutes().toString();
				case "ss":
					return this.date.getSeconds().toString().padStart(2, "0");
				case "s":
					return this.date.getSeconds().toString();
			}
		});
	}
}

window.moment = str => new Moment(str);

	
class UndoStack {
	constructor(el, maxStack) {
		this.el = el;
		this.maxStack = maxStack || 20;
		this.commands = [];
		this.stackPosition = -1;
		this.savePosition = -1;
	}
	execute(command) {
		this._clearRedo();
		command.execute();
		this.commands.push(command);
		this.stackPosition++;
		this.changed();
	}
	undo() {
		if (!this.canUndo()) return;
		this.commands[this.stackPosition].undo();
		this.stackPosition--;
		this.changed();
	}
	canUndo() {
		return this.stackPosition >= 0;
	}
	redo() {
		if (!this.canRedo()) return;
		this.stackPosition++;
		this.commands[this.stackPosition].redo();
		this.changed();
	}
	canRedo() {
		return this.stackPosition < this.commands.length - 1;
	}
	save() {
		this.savePosition = this.stackPosition;
		this.changed();
	}
	dirty() {
		return this.stackPosition != this.savePosition;
	}
	_clearRedo() {
		// TODO there's probably a more efficient way for this
		this.commands = this.commands.slice(0, this.stackPosition + 1);
	}
	changed() {
		// do nothing, override
	}
	restoreSelection(pos) {
		let win = this.el.ownerDocument.defaultView;
		let charIndex = 0;
		let range = document.createRange();
		let nodeStack = [this.el],
			node,
			foundStart = false,
			stop = false;

		range.setStart(this.el, 0);
		range.collapse(true);

		while (!stop && (node = nodeStack.pop())) {
			if (node.nodeType == 3) {
				let nextCharIndex = charIndex + node.length;
				if (!foundStart && pos.start >= charIndex && pos.start <= nextCharIndex) {
					range.setStart(node, pos.start - charIndex);
					foundStart = true;
				}
				if (foundStart && pos.end >= charIndex && pos.end <= nextCharIndex) {
					range.setEnd(node, pos.end - charIndex);
					stop = true;
				}
				charIndex = nextCharIndex;
			} else {
				let i = node.childNodes.length;
				while (i--) {
					nodeStack.push(node.childNodes[i]);
				}
			}
		}
		let sel = win.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
	}
	saveSelection() {
		let win = this.el.ownerDocument.defaultView;
		let range = win.getSelection().getRangeAt(0);
		let preSelectionRange = range.cloneRange();
		preSelectionRange.selectNodeContents(this.el);
		preSelectionRange.setEnd(range.startContainer, range.startOffset);
		let start = preSelectionRange.toString().length;

		return {
			start,
			end: start + range.toString().length
		};
	}
}

class EditCommand {
	constructor(history, textarea, oldValue, newValue, selection) {
		this.history = history;
		this.textarea = textarea;
		this.oldValue = oldValue;
		this.newValue = newValue;
		this.selection = this.history.stack.saveSelection();
	}
	execute() {

	}
	undo() {
		this.history.blocked = true;
		this.textarea.innerHTML = this.oldValue;
		this.history.stack.restoreSelection(this.selection);
	}
	redo() {
		this.history.blocked = true;
		this.textarea.innerHTML = this.newValue;
		this.history.stack.restoreSelection(this.selection);
	}
}

window.UndoStack = UndoStack;
window.EditCommand = EditCommand;


	// publish defiant_ to global scope
	if (defiant_.info_[0] !== "prod") window.defiant_ = defiant_;
	window.$ = $;

	// initiate defiant_
	//window.onload = defiant_.init_.bind(defiant_);
	$.ready(() => defiant_.init_());

})(window, document);
