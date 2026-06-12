/**
 * چت‌بات نفس فارمد — منطق فرانت‌اند (وانیلا جاوااسکریپت).
 * بازسازی دقیق رفتار کامپوننت ری‌اکت ChatBot.tsx.
 */
( function () {
	'use strict';

	var cfg = window.NafasChatbotConfig || {};
	if ( ! cfg.ajaxUrl ) {
		return;
	}

	/* ---------- آیکون‌ها (Lucide, inline SVG) ---------- */
	function svg( paths, size ) {
		size = size || 24;
		return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size +
			'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
			'stroke-linecap="round" stroke-linejoin="round">' + paths + '</svg>';
	}
	var ICON = {
		message: function ( s ) { return svg( '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>', s ); },
		x: function ( s ) { return svg( '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', s ); },
		bot: function ( s ) { return svg( '<path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>', s ); },
		send: function ( s ) { return svg( '<path d="M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z"/><path d="m21.854 2.147-10.94 10.939"/>', s ); },
		loader: function ( s ) { return svg( '<path d="M21 12a9 9 0 1 1-6.219-8.56"/>', s ); },
		sparkles: function ( s ) { return svg( '<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/>', s ); },
		user: function ( s ) { return svg( '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>', s ); },
		package: function ( s ) { return svg( '<path d="M11 21.73a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73z"/><path d="M3.3 7 12 12l8.7-5"/><path d="M12 22V12"/>', s ); },
		chevronLeft: function ( s ) { return svg( '<path d="m15 18-6-6 6-6"/>', s ); },
		arrowRight: function ( s ) { return svg( '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>', s ); },
		building: function ( s ) { return svg( '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>', s ); },
		activity: function ( s ) { return svg( '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>', s ); },
		headphones: function ( s ) { return svg( '<path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zm0 0a9 9 0 0 1 18 0m0 0v3a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2z"/>', s ); },
		check: function ( s ) { return svg( '<path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>', s ); },
		phone: function ( s ) { return svg( '<path d="M13.832 16.568a1 1 0 0 0 1.213-.303l.355-.465A2 2 0 0 1 17 15h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2A18 18 0 0 1 2 4a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v3a2 2 0 0 1-.8 1.6l-.468.351a1 1 0 0 0-.292 1.233 14 14 0 0 0 6.392 6.384"/>', s ); },
		fileText: function ( s ) { return svg( '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>', s ); }
	};

	/* ---------- وضعیت ---------- */
	var state = {
		isOpen: false,
		view: 'menu', // menu | products | chat | adr_select | adr_form | consult_form | success
		selectedProduct: null,
		messages: [],
		isLoading: false,
		form: {
			name: '', phone: '', description: '', productName: '',
			reporterType: '', severity: '', outcome: '', batchNumber: '', concomitantDrugs: ''
		}
	};

	var quickReplies = ( cfg.quickReplies || [] ).filter( function ( q ) { return q && q.label && q.question; } );
	var adrOptions = cfg.adrOptions || { severity: [], outcome: [], reporter_type: [] };

	var products = ( cfg.products || [] ).filter( function ( p ) { return p && p.id; } );
	var companyInfo = { id: cfg.companyId || 'nafas', name: cfg.companyName || '' };

	/* ---------- ابزارها ---------- */
	function el( tag, cls, html ) {
		var n = document.createElement( tag );
		if ( cls ) { n.className = cls; }
		if ( html != null ) { n.innerHTML = html; }
		return n;
	}

	function boldify( text ) {
		// تبدیل **متن** به <strong> و حفظ امنیت (escape سپس markdown).
		var div = document.createElement( 'div' );
		div.textContent = text;
		var safe = div.innerHTML;
		return safe.replace( /\*\*(.+?)\*\*/g, '<strong>$1</strong>' ).replace( /\n/g, '<br>' );
	}

	var toastTimer = null;
	function toast( msg, isError ) {
		var t = document.getElementById( 'nfx-toast' );
		if ( ! t ) {
			t = el( 'div', 'nfx-toast' );
			t.id = 'nfx-toast';
			document.body.appendChild( t );
		}
		t.className = 'nfx-toast' + ( isError ? ' nfx-toast--error' : '' );
		t.textContent = msg;
		// reflow.
		void t.offsetWidth;
		t.classList.add( 'is-show' );
		clearTimeout( toastTimer );
		toastTimer = setTimeout( function () { t.classList.remove( 'is-show' ); }, 4000 );
	}

	function ajax( action, data ) {
		var body = new URLSearchParams();
		body.append( 'action', action );
		body.append( 'nonce', cfg.nonce );
		Object.keys( data ).forEach( function ( k ) { body.append( k, data[ k ] ); } );
		return fetch( cfg.ajaxUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: body
		} ).then( function ( r ) {
			return r.json().then( function ( j ) { return { ok: r.ok, status: r.status, json: j }; } );
		} );
	}

	/* ---------- DOM ریشه ---------- */
	var root = document.getElementById( 'nafas-chatbot-root' );
	if ( ! root ) {
		root = el( 'div', 'nfx-root' );
		root.id = 'nafas-chatbot-root';
		root.setAttribute( 'dir', 'rtl' );
		document.body.appendChild( root );
	}

	// اعمال تنظیمات ظاهری.
	root.classList.add( cfg.position === 'left' ? 'nfx-pos-left' : 'nfx-pos-right' );
	applyTheme();
	applyColors();

	function applyTheme() {
		var mode = cfg.themeMode || 'auto';
		if ( mode === 'dark' ) {
			root.setAttribute( 'data-theme', 'dark' );
		} else if ( mode === 'light' ) {
			root.setAttribute( 'data-theme', 'light' );
		} else {
			// auto — تبعیت از تم سند یا سیستم.
			var docTheme = document.documentElement.getAttribute( 'data-theme' );
			if ( docTheme === 'dark' ) {
				root.setAttribute( 'data-theme', 'dark' );
			} else if ( window.matchMedia && window.matchMedia( '(prefers-color-scheme: dark)' ).matches && ! docTheme ) {
				root.setAttribute( 'data-theme', 'dark' );
			}
		}
	}

	function applyColors() {
		if ( cfg.primaryColor ) { root.style.setProperty( '--nfx-primary', cfg.primaryColor ); }
		if ( cfg.primaryHover ) { root.style.setProperty( '--nfx-primary-hover', cfg.primaryHover ); }
	}

	/* ---------- ساخت اسکلت ---------- */
	var toggle = el( 'button', 'nfx-toggle' );
	toggle.setAttribute( 'aria-label', 'باز کردن گفتگو' );
	root.appendChild( toggle );

	var win = el( 'div', 'nfx-window is-closed' );
	root.appendChild( win );

	toggle.addEventListener( 'click', function () {
		state.isOpen = ! state.isOpen;
		renderToggle();
		win.classList.toggle( 'is-open', state.isOpen );
		win.classList.toggle( 'is-closed', ! state.isOpen );
		if ( state.isOpen ) { renderWindow(); }
	} );

	function renderToggle() {
		toggle.classList.toggle( 'is-open', state.isOpen );
		if ( state.isOpen ) {
			toggle.innerHTML = ICON.x( 28 );
		} else {
			toggle.innerHTML =
				'<span class="nfx-toggle__ping">' + ICON.message( 28 ) + '</span>' +
				ICON.message( 28 ) +
				'<span class="nfx-toggle__dot"><span></span><span></span></span>';
		}
	}
	renderToggle();

	/* ---------- منطق ناوبری ---------- */
	function resetChat() {
		state.selectedProduct = null;
		state.messages = [];
		state.form = {
			name: '', phone: '', description: '', productName: '',
			reporterType: '', severity: '', outcome: '', batchNumber: '', concomitantDrugs: ''
		};
		state.view = 'menu';
		renderWindow();
	}

	function productById( id ) {
		return products.filter( function ( x ) { return x.id === id; } )[ 0 ];
	}

	function goBack() {
		if ( state.view === 'success' ) { return resetChat(); }
		if ( state.view === 'adr_form' ) { state.view = 'adr_select'; }
		else { state.view = 'menu'; }
		renderWindow();
	}

	function handleOption( option ) {
		if ( option === 'company' ) {
			state.selectedProduct = companyInfo.id;
			state.messages = [ { role: 'assistant', content: 'سلام! من آماده پاسخگویی به سوالات شما درباره **' + companyInfo.name + '** هستم.' } ];
			state.view = 'chat';
		} else if ( option === 'products' ) {
			state.view = 'products';
		} else if ( option === 'adr' ) {
			state.view = 'adr_select';
		} else if ( option === 'consult' ) {
			state.view = 'consult_form';
		}
		renderWindow();
	}

	function selectProduct( id ) {
		state.selectedProduct = id;
		var name = productName( id );
		state.messages = [ { role: 'assistant', content: 'سلام! من دستیار هوشمند محصول **' + name + '** هستم. هر سوالی در مورد این دارو دارید بپرسید.' } ];
		state.view = 'chat';
		renderWindow();
	}

	function selectAdrProduct( id ) {
		state.form.productName = productName( id );
		state.view = 'adr_form';
		renderWindow();
	}

	function productName( id ) {
		var p = products.filter( function ( x ) { return x.id === id; } )[ 0 ];
		return p ? p.name : '';
	}

	/* ---------- ارسال پیام چت ---------- */
	function sendChat( text ) {
		if ( ! text.trim() || state.isLoading || ! state.selectedProduct ) { return; }

		// حافظه مکالمه: تاریخچه پیش از افزودن پیام جاری (حذف پیام‌های خوش‌آمد ابتدایی).
		var history = state.messages.map( function ( m ) {
			return { role: m.role, content: m.content };
		} );
		while ( history.length && history[ 0 ].role === 'assistant' ) {
			history.shift();
		}

		state.messages.push( { role: 'user', content: text } );
		state.isLoading = true;
		renderWindow();

		ajax( 'nafas_chatbot_chat', {
			message: text,
			product: state.selectedProduct,
			history: JSON.stringify( history )
		} )
			.then( function ( res ) {
				state.isLoading = false;
				var reply;
				if ( res.ok && res.json && res.json.success ) {
					reply = res.json.data.reply || 'متاسفانه مشکلی در دریافت پاسخ پیش آمد.';
				} else {
					reply = ( res.json && res.json.data && res.json.data.message ) || 'خطا در ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.';
				}
				state.messages.push( { role: 'assistant', content: reply } );
				renderWindow();
			} )
			.catch( function () {
				state.isLoading = false;
				state.messages.push( { role: 'assistant', content: 'خطا در ارتباط با سرور. لطفا اتصال اینترنت خود را بررسی کنید.' } );
				renderWindow();
			} );
	}

	/* ---------- ارسال فرم ---------- */
	function submitForm() {
		state.isLoading = true;
		renderWindow();

		var isAdr = state.view === 'adr_form';
		var payload = {
			type: isAdr ? 'گزارش عوارض دارویی' : 'درخواست مشاوره',
			name: state.form.name,
			phone: state.form.phone,
			description: state.form.description
		};
		if ( isAdr ) {
			payload.product = state.form.productName;
			payload.reporter_type = state.form.reporterType;
			payload.severity = state.form.severity;
			payload.outcome = state.form.outcome;
			payload.batch_number = state.form.batchNumber;
			payload.concomitant_drugs = state.form.concomitantDrugs;
		}

		ajax( 'nafas_chatbot_submit', payload )
			.then( function ( res ) {
				state.isLoading = false;
				if ( res.ok && res.json && res.json.success ) {
					state.view = 'success';
					renderWindow();
				} else {
					var msg = ( res.json && res.json.data && res.json.data.message ) || 'متاسفانه در ثبت اطلاعات مشکلی پیش آمد. لطفا اتصال اینترنت خود را بررسی کرده و مجددا تلاش کنید.';
					toast( msg, true );
					renderWindow();
				}
			} )
			.catch( function () {
				state.isLoading = false;
				toast( 'متاسفانه در ثبت اطلاعات مشکلی پیش آمد. لطفا اتصال اینترنت خود را بررسی کرده و مجددا تلاش کنید.', true );
				renderWindow();
			} );
	}

	/* ---------- عناوین هدر ---------- */
	function headerTitle() {
		switch ( state.view ) {
			case 'menu': return cfg.headerTitle || 'دستیار هوشمند';
			case 'products': return 'انتخاب محصول';
			case 'adr_select': return 'انتخاب دارو';
			case 'adr_form': return 'ثبت عوارض';
			case 'consult_form': return 'درخواست مشاوره';
			case 'success': return 'تکمیل عملیات';
		}
		if ( state.selectedProduct === companyInfo.id ) { return companyInfo.name; }
		return productName( state.selectedProduct ) || ( cfg.headerTitle || 'دستیار هوشمند' );
	}

	function headerSub() {
		if ( state.view === 'chat' ) { return 'متصل به پایگاه دانش'; }
		if ( state.view === 'adr_form' || state.view === 'consult_form' ) { return 'اطلاعات خود را وارد کنید'; }
		return 'آنلاین';
	}

	function headerIcon() {
		if ( state.view === 'consult_form' ) { return ICON.headphones( 24 ); }
		if ( state.view === 'adr_form' || state.view === 'adr_select' ) { return ICON.activity( 24 ); }
		return ICON.bot( 24 );
	}

	/* ---------- رندر ---------- */
	function renderWindow() {
		win.innerHTML = '';
		win.appendChild( buildHeader() );

		if ( state.view === 'menu' ) { win.appendChild( buildMenu() ); }
		else if ( state.view === 'products' || state.view === 'adr_select' ) { win.appendChild( buildProductSelect() ); }
		else if ( state.view === 'adr_form' || state.view === 'consult_form' ) { win.appendChild( buildForm() ); }
		else if ( state.view === 'success' ) { win.appendChild( buildSuccess() ); }
		else if ( state.view === 'chat' ) { buildChat( win ); }

		scrollChatToBottom();
	}

	function buildHeader() {
		var h = el( 'div', 'nfx-header' );
		if ( state.view !== 'menu' ) {
			var back = el( 'button', 'nfx-header__back', ICON.arrowRight( 20 ) );
			back.setAttribute( 'aria-label', 'بازگشت' );
			back.addEventListener( 'click', goBack );
			h.appendChild( back );
		}
		h.appendChild( el( 'div', 'nfx-header__icon', headerIcon() ) );
		var texts = el( 'div', 'nfx-header__texts' );
		texts.appendChild( el( 'h3', 'nfx-header__title', escapeHtml( headerTitle() ) ) );
		texts.appendChild( el( 'p', 'nfx-header__sub', '<i></i>' + escapeHtml( headerSub() ) ) );
		h.appendChild( texts );
		h.appendChild( el( 'div', 'nfx-header__sparkle', ICON.sparkles( 96 ) ) );
		return h;
	}

	function escapeHtml( str ) {
		var d = document.createElement( 'div' );
		d.textContent = str == null ? '' : str;
		return d.innerHTML;
	}

	function buildMenu() {
		var body = el( 'div', 'nfx-body nfx-body--pad' );

		// حباب خوش‌آمد گفتگومحور.
		var welcome = el( 'div', 'nfx-msg nfx-msg--bot nfx-onboard' );
		welcome.innerHTML =
			'<span class="nfx-msg__avatar">' + ICON.bot( 16 ) + '</span>' +
			'<div class="nfx-msg__bubble">' +
				'<strong>' + escapeHtml( cfg.welcomeTitle || 'سلام! 👋' ) + '</strong>' +
				'<div class="nfx-onboard__text">' + ( cfg.welcomeText || '' ) + '</div>' +
			'</div>';
		body.appendChild( welcome );

		// چیپس‌های پیشنهادی.
		var suggest = el( 'div', 'nfx-suggest' );
		suggest.appendChild( el( 'p', 'nfx-suggest__hint', 'یکی از گزینه‌های زیر را انتخاب کنید:' ) );

		if ( cfg.show && cfg.show.company ) {
			suggest.appendChild( suggestChip( 'blue', ICON.building( 18 ), cfg.labels.companyTitle, function () { handleOption( 'company' ); } ) );
		}
		if ( cfg.show && cfg.show.products ) {
			suggest.appendChild( suggestChip( 'green', ICON.package( 18 ), cfg.labels.productsTitle, function () { handleOption( 'products' ); } ) );
		}
		if ( cfg.show && cfg.show.adr ) {
			suggest.appendChild( suggestChip( 'red', ICON.activity( 18 ), cfg.labels.adrTitle, function () { handleOption( 'adr' ); } ) );
		}
		if ( cfg.show && cfg.show.consult ) {
			suggest.appendChild( suggestChip( 'purple', ICON.headphones( 18 ), cfg.labels.consultTitle, function () { handleOption( 'consult' ); } ) );
		}

		body.appendChild( suggest );
		return body;
	}

	function suggestChip( color, icon, label, onClick ) {
		var b = el( 'button', 'nfx-suggest-chip nfx-suggest-chip--' + color );
		b.innerHTML =
			'<span class="nfx-suggest-chip__icon">' + icon + '</span>' +
			'<span class="nfx-suggest-chip__label">' + escapeHtml( label ) + '</span>' +
			'<span class="nfx-suggest-chip__chevron">' + ICON.chevronLeft( 16 ) + '</span>';
		b.addEventListener( 'click', onClick );
		return b;
	}

	function buildProductSelect() {
		var body = el( 'div', 'nfx-body nfx-body--pad' );
		var hint = state.view === 'products'
			? 'لطفا محصولی که درباره آن سوال دارید را انتخاب کنید:'
			: 'لطفا دارویی که باعث عارضه شده است را انتخاب کنید:';
		body.appendChild( el( 'p', 'nfx-select-hint', escapeHtml( hint ) ) );

		var listWrap = el( 'div', 'nfx-product-list' );
		products.forEach( function ( p ) {
			var b = el( 'button', 'nfx-product-btn' );
			b.innerHTML =
				'<span class="nfx-product-btn__icon">' + ICON.package( 20 ) + '</span>' +
				'<span class="nfx-product-btn__name">' + escapeHtml( p.name ) + '</span>' +
				'<span class="nfx-product-btn__chevron">' + ICON.chevronLeft( 16 ) + '</span>';
			b.addEventListener( 'click', function () {
				state.view === 'products' ? selectProduct( p.id ) : selectAdrProduct( p.id );
			} );
			listWrap.appendChild( b );
		} );
		body.appendChild( listWrap );
		return body;
	}

	function buildForm() {
		var isAdr = state.view === 'adr_form';
		var body = el( 'div', 'nfx-body nfx-body--flex' );

		if ( isAdr ) {
			body.appendChild( el( 'div', 'nfx-adr-warning',
				'شما در حال ثبت گزارش عارضه برای داروی <b>' + escapeHtml( state.form.productName ) + '</b> هستید.' ) );
		}

		var form = el( 'form', 'nfx-form' );

		// نام.
		form.appendChild( field( 'name', ICON.user( 14 ) + ' نام و نام خانوادگی', 'text', 'مثلا: علی احمدی', false ) );
		// تلفن.
		form.appendChild( field( 'phone', ICON.phone( 14 ) + ' شماره تماس', 'tel', '0912...', true ) );

		// نوع گزارش‌دهنده (فقط عوارض).
		if ( isAdr && adrOptions.reporter_type && adrOptions.reporter_type.length ) {
			form.appendChild( selectField( 'reporterType', ICON.user( 14 ) + ' نوع گزارش‌دهنده', adrOptions.reporter_type, 'انتخاب کنید...' ) );
		}

		// توضیحات.
		var descLabel = isAdr ? ' شرح عارضه مشاهده شده' : ' موضوع و خلاصه درخواست';
		var descPlaceholder = isAdr
			? 'لطفا علائم و مشکلاتی که پس از مصرف دارو پیش آمد را با جزئیات بنویسید...'
			: 'لطفا به صورت خلاصه بنویسید که در چه موردی نیاز به مشاوره دارید...';
		var fDesc = el( 'div', 'nfx-field' );
		fDesc.appendChild( el( 'label', 'nfx-field__label', ICON.fileText( 14 ) + escapeHtml( descLabel ) ) );
		var ta = el( 'textarea', 'nfx-textarea' );
		ta.rows = isAdr ? 4 : 4;
		ta.required = true;
		ta.placeholder = descPlaceholder;
		ta.value = state.form.description;
		ta.addEventListener( 'input', function () { state.form.description = ta.value; } );
		fDesc.appendChild( ta );
		form.appendChild( fDesc );

		// فیلدهای استاندارد عوارض دارویی.
		if ( isAdr ) {
			var grid = el( 'div', 'nfx-grid2' );
			if ( adrOptions.severity && adrOptions.severity.length ) {
				grid.appendChild( selectField( 'severity', ICON.activity( 14 ) + ' شدت عارضه', adrOptions.severity, 'انتخاب...' ) );
			}
			if ( adrOptions.outcome && adrOptions.outcome.length ) {
				grid.appendChild( selectField( 'outcome', ICON.check( 14 ) + ' پیامد', adrOptions.outcome, 'انتخاب...' ) );
			}
			if ( grid.children.length ) { form.appendChild( grid ); }

			form.appendChild( field( 'batchNumber', ICON.fileText( 14 ) + ' شماره سری ساخت (Batch) — اختیاری', 'text', 'روی بسته‌بندی دارو درج شده', true, false ) );

			var fCon = el( 'div', 'nfx-field' );
			fCon.appendChild( el( 'label', 'nfx-field__label', ICON.package( 14 ) + escapeHtml( ' داروهای مصرفی همزمان — اختیاری' ) ) );
			var taCon = el( 'textarea', 'nfx-textarea' );
			taCon.rows = 2;
			taCon.placeholder = 'سایر داروهایی که همزمان مصرف می‌کنید را بنویسید...';
			taCon.value = state.form.concomitantDrugs;
			taCon.addEventListener( 'input', function () { state.form.concomitantDrugs = taCon.value; } );
			fCon.appendChild( taCon );
			form.appendChild( fCon );
		}

		// دکمه ارسال.
		var btn = el( 'button', 'nfx-submit ' + ( isAdr ? 'nfx-submit--red' : 'nfx-submit--purple' ) );
		btn.type = 'submit';
		btn.disabled = state.isLoading;
		btn.innerHTML = ( state.isLoading ? '<span class="nfx-spin">' + ICON.loader( 20 ) + '</span>' : ICON.check( 20 ) ) +
			'<span>' + ( isAdr ? 'ثبت گزارش عوارض' : 'ثبت درخواست مشاوره' ) + '</span>';
		form.appendChild( btn );

		form.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			submitForm();
		} );

		body.appendChild( form );
		return body;
	}

	function field( key, labelHtml, type, placeholder, ltr, required ) {
		var f = el( 'div', 'nfx-field' );
		f.appendChild( el( 'label', 'nfx-field__label', labelHtml ) );
		var inp = el( 'input', 'nfx-input' + ( ltr ? ' nfx-input--ltr' : '' ) );
		inp.type = type;
		inp.required = ( required === false ) ? false : true;
		inp.placeholder = placeholder;
		inp.value = state.form[ key ];
		inp.addEventListener( 'input', function () { state.form[ key ] = inp.value; } );
		f.appendChild( inp );
		return f;
	}

	function selectField( key, labelHtml, options, placeholder ) {
		var f = el( 'div', 'nfx-field' );
		f.appendChild( el( 'label', 'nfx-field__label', labelHtml ) );
		var sel = el( 'select', 'nfx-input nfx-select' );
		var ph = el( 'option' );
		ph.value = '';
		ph.textContent = placeholder || 'انتخاب کنید...';
		sel.appendChild( ph );
		options.forEach( function ( opt ) {
			var o = el( 'option' );
			o.value = opt;
			o.textContent = opt;
			if ( state.form[ key ] === opt ) { o.selected = true; }
			sel.appendChild( o );
		} );
		sel.addEventListener( 'change', function () { state.form[ key ] = sel.value; } );
		f.appendChild( sel );
		return f;
	}

	function buildSuccess() {
		var body = el( 'div', 'nfx-body nfx-success' );
		body.appendChild( el( 'div', 'nfx-success__icon', ICON.check( 48 ) ) );
		body.appendChild( el( 'h3', 'nfx-success__title', 'ثبت موفقیت‌آمیز' ) );
		body.appendChild( el( 'p', 'nfx-success__text', 'اطلاعات شما با موفقیت در سیستم ثبت شد.<br>کارشناسان ما در اسرع وقت با شما تماس خواهند گرفت.' ) );
		var btn = el( 'button', 'nfx-success__btn', 'بازگشت به منوی اصلی' );
		btn.addEventListener( 'click', resetChat );
		body.appendChild( btn );
		return body;
	}

	function buildChat( container ) {
		var body = el( 'div', 'nfx-body' );
		var chat = el( 'div', 'nfx-chat' );

		state.messages.forEach( function ( m ) {
			var row = el( 'div', 'nfx-msg ' + ( m.role === 'user' ? 'nfx-msg--user' : 'nfx-msg--bot' ) );
			row.innerHTML =
				'<span class="nfx-msg__avatar">' + ( m.role === 'user' ? ICON.user( 16 ) : ICON.bot( 16 ) ) + '</span>' +
				'<div class="nfx-msg__bubble">' + boldify( m.content ) + '</div>';
			chat.appendChild( row );
		} );

		if ( state.isLoading ) {
			var typing = el( 'div', 'nfx-msg nfx-msg--bot' );
			typing.innerHTML =
				'<span class="nfx-msg__avatar">' + ICON.bot( 16 ) + '</span>' +
				'<div class="nfx-typing"><span></span><span></span><span></span></div>';
			chat.appendChild( typing );
		}

		body.appendChild( chat );
		container.appendChild( body );

		// فوتر ورودی.
		var foot = el( 'form', 'nfx-chat-foot' );

		// پاسخ‌های پیشنهادی (فقط در گفتگوی محصول و نه شرکت).
		var isProductChat = state.selectedProduct && state.selectedProduct !== companyInfo.id;
		if ( cfg.quickRepliesEnabled && isProductChat && ! state.isLoading ) {
			var prod = productById( state.selectedProduct );
			var chips = el( 'div', 'nfx-qr' );
			quickReplies.forEach( function ( qr ) {
				var c = el( 'button', 'nfx-qr-chip' );
				c.type = 'button';
				c.textContent = qr.label;
				c.addEventListener( 'click', function () { sendChat( qr.question ); } );
				chips.appendChild( c );
			} );
			// دکمه بروشور در صورت وجود لینک.
			if ( prod && prod.brochure ) {
				var br = el( 'button', 'nfx-qr-chip nfx-qr-chip--brochure' );
				br.type = 'button';
				br.innerHTML = ICON.fileText( 13 ) + '<span>' + escapeHtml( cfg.brochureLabel || 'مشاهده بروشور' ) + '</span>';
				br.addEventListener( 'click', function () { window.open( prod.brochure, '_blank', 'noopener' ); } );
				chips.appendChild( br );
			}
			if ( chips.children.length ) { foot.appendChild( chips ); }
		}

		var wrap = el( 'div', 'nfx-input-wrap' );
		var input = el( 'input' );
		input.type = 'text';
		input.placeholder = 'پیام خود را بنویسید...';
		input.disabled = state.isLoading;
		var sendBtn = el( 'button', 'nfx-send' );
		sendBtn.type = 'submit';
		sendBtn.disabled = state.isLoading;
		sendBtn.innerHTML = state.isLoading ? '<span class="nfx-spin">' + ICON.loader( 18 ) + '</span>' : ICON.send( 18 );
		wrap.appendChild( input );
		wrap.appendChild( sendBtn );
		foot.appendChild( wrap );
		foot.appendChild( el( 'p', 'nfx-disclaimer', escapeHtml( cfg.disclaimer || '' ) ) );

		foot.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var val = input.value;
			if ( ! val.trim() ) { return; }
			input.value = '';
			sendChat( val );
		} );

		container.appendChild( foot );

		// فوکوس.
		if ( ! state.isLoading ) {
			setTimeout( function () { input.focus(); }, 100 );
		}
	}

	function scrollChatToBottom() {
		var body = win.querySelector( '.nfx-body' );
		if ( body ) { body.scrollTop = body.scrollHeight; }
	}

	// رندر اولیه پنجره (مخفی).
	renderWindow();

} )();
