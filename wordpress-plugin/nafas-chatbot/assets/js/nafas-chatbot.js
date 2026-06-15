/**
 * چت‌بات نفس فارمد — منطق فرانت‌اند (وانیلا جاوااسکریپت).
 * معماری تک‌صفحه‌ای گفتگو‌محور: همه‌چیز در یک رشته چت (حباب‌ها + چیپس گزینه‌ها + کارت فرم + ورودی ثابت).
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
		fileText: function ( s ) { return svg( '<path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>', s ); },
		refresh: function ( s ) { return svg( '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/>', s ); }
	};

	/* ---------- پیکربندی ---------- */
	var products    = ( cfg.products || [] ).filter( function ( p ) { return p && p.id; } );
	var companyInfo = { id: cfg.companyId || 'nafas', name: cfg.companyName || '' };
	var quickReplies = ( cfg.quickReplies || [] ).filter( function ( q ) { return q && q.label && q.question; } );
	var adrOptions  = cfg.adrOptions || { severity: [], outcome: [], reporter_type: [] };
	var labels      = cfg.labels || {};
	var show        = cfg.show || { company: true, products: true, adr: true, consult: true };

	/* ---------- وضعیت (تک‌رشته‌ای) ---------- */
	var state = {
		isOpen: false,
		started: false,
		items: [],            // {kind:'bot'|'user'|'form'|'success', content, noHistory, ...}
		chips: [],            // گزینه‌های فعال فعلی
		selectedProduct: null, // محصول فعال برای گفتگوی AI (null = عمومی)
		isLoading: false,
		form: emptyForm()
	};

	function emptyForm() {
		return {
			kind: '', productName: '', hp: '',
			name: '', phone: '', description: '',
			reporterType: '', severity: '', outcome: '', batchNumber: '', concomitantDrugs: ''
		};
	}

	/* ---------- ابزارها ---------- */
	function el( tag, cls, html ) {
		var n = document.createElement( tag );
		if ( cls ) { n.className = cls; }
		if ( html != null ) { n.innerHTML = html; }
		return n;
	}

	function escapeHtml( str ) {
		var d = document.createElement( 'div' );
		d.textContent = str == null ? '' : str;
		return d.innerHTML;
	}

	// تبدیل عناصر درون‌خطی Markdown (روی متنِ از قبل escape‌شده).
	function mdInline( s ) {
		// کد درون‌خطی.
		s = s.replace( /`([^`]+)`/g, function ( m, c ) { return '<code>' + c + '</code>'; } );
		// لینک [متن](آدرس) — فقط http/https/mailto/tel.
		s = s.replace( /\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|tel:[^\s)]+)\)/g, function ( m, t, u ) {
			return '<a href="' + u + '" target="_blank" rel="noopener noreferrer">' + t + '</a>';
		} );
		// پررنگ.
		s = s.replace( /\*\*([^*]+)\*\*/g, '<strong>$1</strong>' );
		s = s.replace( /__([^_]+)__/g, '<strong>$1</strong>' );
		// مورب.
		s = s.replace( /(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>' );
		return s;
	}

	// رندر Markdown کامل (تیتر، لیست، نقل‌قول، خط جداکننده، پاراگراف) با escape امن.
	function boldify( raw ) {
		var text = escapeHtml( raw == null ? '' : String( raw ) );
		var lines = text.split( /\r?\n/ );
		var html = '';
		var para = [];
		var listType = null;
		function flushPara() {
			if ( para.length ) {
				html += '<p>' + para.map( mdInline ).join( '<br>' ) + '</p>';
				para = [];
			}
		}
		function closeList() {
			if ( listType ) { html += '</' + listType + '>'; listType = null; }
		}
		for ( var i = 0; i < lines.length; i++ ) {
			var t = lines[ i ].trim();
			if ( t === '' ) { flushPara(); closeList(); continue; }
			if ( /^(-{3,}|_{3,}|\*{3,})$/.test( t ) ) { flushPara(); closeList(); html += '<hr>'; continue; }
			var h = t.match( /^(#{1,6})\s+(.*)$/ );
			if ( h ) { flushPara(); closeList(); html += '<div class="nfx-md-h nfx-md-h' + Math.min( h[ 1 ].length, 4 ) + '">' + mdInline( h[ 2 ] ) + '</div>'; continue; }
			if ( /^>\s?/.test( t ) ) { flushPara(); closeList(); html += '<blockquote>' + mdInline( t.replace( /^>\s?/, '' ) ) + '</blockquote>'; continue; }
			var ul = t.match( /^[-*+]\s+(.*)$/ );
			if ( ul ) { flushPara(); if ( listType !== 'ul' ) { closeList(); html += '<ul>'; listType = 'ul'; } html += '<li>' + mdInline( ul[ 1 ] ) + '</li>'; continue; }
			var ol = t.match( /^\d+[.)]\s+(.*)$/ );
			if ( ol ) { flushPara(); if ( listType !== 'ol' ) { closeList(); html += '<ol>'; listType = 'ol'; } html += '<li>' + mdInline( ol[ 1 ] ) + '</li>'; continue; }
			closeList();
			para.push( t );
		}
		flushPara();
		closeList();
		return html;
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
			return r.text().then( function ( txt ) {
				var json = null;
				try { json = JSON.parse( txt ); } catch ( e ) { json = null; }
				return { ok: r.ok, status: r.status, json: json, raw: txt };
			} );
		} );
	}

	function errorMessage( res ) {
		if ( res && res.json && res.json.data && res.json.data.message ) {
			return res.json.data.message;
		}
		if ( res && ( res.raw === '-1' || res.raw === '0' || res.status === 403 ) ) {
			return 'نشست شما منقضی شده است. لطفاً صفحه را تازه‌سازی (Refresh) کنید و دوباره تلاش کنید.';
		}
		return 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید و دوباره تلاش کنید.';
	}

	function productName( id ) {
		if ( id === companyInfo.id ) { return companyInfo.name; }
		var p = products.filter( function ( x ) { return x.id === id; } )[ 0 ];
		return p ? p.name : '';
	}
	function productById( id ) {
		return products.filter( function ( x ) { return x.id === id; } )[ 0 ];
	}

	/* ---------- ریشه و ظاهر ---------- */
	var root = document.getElementById( 'nafas-chatbot-root' );
	if ( ! root ) {
		root = el( 'div', 'nfx-root' );
		root.id = 'nafas-chatbot-root';
		root.setAttribute( 'dir', 'rtl' );
		document.body.appendChild( root );
	}
	root.classList.add( cfg.position === 'left' ? 'nfx-pos-left' : 'nfx-pos-right' );
	applyTheme();
	applyColors();

	function applyTheme() {
		var mode = cfg.themeMode || 'light';
		if ( mode === 'dark' ) {
			root.setAttribute( 'data-theme', 'dark' );
		} else if ( mode === 'auto' ) {
			root.setAttribute( 'data-theme', document.documentElement.getAttribute( 'data-theme' ) === 'dark' ? 'dark' : 'light' );
		} else {
			root.setAttribute( 'data-theme', 'light' );
		}
	}
	function applyColors() {
		if ( cfg.primaryColor ) { root.style.setProperty( '--nfx-primary', cfg.primaryColor ); }
		if ( cfg.primaryHover ) { root.style.setProperty( '--nfx-primary-hover', cfg.primaryHover ); }
		if ( cfg.buttonSize ) { root.style.setProperty( '--nfx-btn-size', parseInt( cfg.buttonSize, 10 ) + 'px' ); }
		if ( cfg.iconSize ) { root.style.setProperty( '--nfx-icon-size', parseInt( cfg.iconSize, 10 ) + 'px' ); }
	}
	var iconPx = parseInt( cfg.iconSize, 10 ) || 28;

	/* ---------- اسکلت ---------- */
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
		if ( state.isOpen ) {
			if ( ! state.started ) { startConversation(); }
			renderWindow();
		}
	} );

	function renderToggle() {
		toggle.classList.toggle( 'is-open', state.isOpen );
		if ( state.isOpen ) {
			toggle.innerHTML = ICON.x( iconPx );
		} else if ( cfg.buttonIconUrl ) {
			toggle.innerHTML =
				'<img src="' + escapeHtml( cfg.buttonIconUrl ) + '" alt="" class="nfx-toggle__img" />' +
				'<span class="nfx-toggle__dot"><span></span><span></span></span>';
		} else {
			toggle.innerHTML =
				'<span class="nfx-toggle__ping">' + ICON.message( iconPx ) + '</span>' +
				ICON.message( iconPx ) +
				'<span class="nfx-toggle__dot"><span></span><span></span></span>';
		}
	}
	renderToggle();

	function closeChat() {
		if ( ! state.isOpen ) { return; }
		state.isOpen = false;
		renderToggle();
		win.classList.add( 'is-closed' );
		win.classList.remove( 'is-open' );
	}

	// بستن با کلیک بیرون از چت‌بات.
	// نکته: در فاز capture بررسی می‌شود تا «قبل از» رندر دوبارهٔ پنجره اجرا شود؛
	// در غیر این صورت عنصرِ کلیک‌شده با re-render از DOM حذف شده و اشتباهاً «بیرون» تشخیص داده می‌شود.
	document.addEventListener( 'click', function ( e ) {
		if ( state.isOpen && ! root.contains( e.target ) ) {
			closeChat();
		}
	}, true );

	// بستن با کلید Escape.
	document.addEventListener( 'keydown', function ( e ) {
		if ( 'Escape' === e.key ) { closeChat(); }
	} );

	/* ---------- افزودن آیتم به رشته ---------- */
	function pushBot( content, opts ) {
		opts = opts || {};
		state.items.push( { kind: 'bot', content: content, noHistory: ! ! opts.noHistory } );
	}
	function pushUser( content, opts ) {
		opts = opts || {};
		state.items.push( { kind: 'user', content: content, noHistory: ! ! opts.noHistory } );
	}

	/* ---------- جریان گفتگو ---------- */
	function startConversation() {
		state.started = true;
		state.items = [];
		state.selectedProduct = null;
		state.form = emptyForm();
		pushBot( ( cfg.welcomeTitle ? cfg.welcomeTitle + ' ' : '' ) + stripTags( cfg.welcomeText || 'چطور می‌تونم کمکتون کنم؟' ), { noHistory: true } );
		showMainOptions();
	}

	function stripTags( s ) {
		var d = document.createElement( 'div' );
		d.innerHTML = s;
		return d.textContent || d.innerText || '';
	}

	function showMainOptions() {
		var chips = [];
		if ( show.company ) {
			chips.push( chip( 'blue', ICON.building( 18 ), labels.companyTitle || 'سوال در مورد شرکت', chooseCompany ) );
		}
		if ( show.products ) {
			chips.push( chip( 'green', ICON.package( 18 ), labels.productsTitle || 'سوال در مورد محصولات', chooseProducts ) );
		}
		if ( show.adr ) {
			chips.push( chip( 'red', ICON.activity( 18 ), labels.adrTitle || 'ثبت عوارض', chooseAdr ) );
		}
		if ( show.consult ) {
			chips.push( chip( 'purple', ICON.headphones( 18 ), labels.consultTitle || 'درخواست مشاوره', chooseConsult ) );
		}
		state.chips = chips;
	}

	function chip( color, icon, label, onClick ) {
		return { color: color, icon: icon, label: label, onClick: onClick };
	}

	function chooseCompany() {
		state.chips = [];
		pushUser( labels.companyTitle || 'سوال در مورد شرکت', { noHistory: true } );
		state.selectedProduct = companyInfo.id;
		pushBot( 'بسیار خب! درباره **' + ( companyInfo.name || 'شرکت' ) + '** هر سوالی دارید بپرسید. 👇', { noHistory: true } );
		render();
	}

	function chooseProducts() {
		state.chips = [];
		pushUser( labels.productsTitle || 'سوال در مورد محصولات', { noHistory: true } );
		pushBot( 'لطفاً محصولی که درباره آن سوال دارید را انتخاب کنید:', { noHistory: true } );
		state.chips = products.map( function ( p ) {
			return chip( 'plain', ICON.package( 18 ), p.name, function () { selectProduct( p.id ); } );
		} );
		render();
	}

	function selectProduct( id ) {
		state.chips = [];
		pushUser( productName( id ), { noHistory: true } );
		state.selectedProduct = id;
		pushBot( 'سلام! من دستیار هوشمند محصول **' + productName( id ) + '** هستم. هر سوالی در مورد این دارو دارید بپرسید. 💊', { noHistory: true } );
		setProductQuickReplies();
		render();
	}

	function setProductQuickReplies() {
		if ( ! cfg.quickRepliesEnabled ) { state.chips = []; return; }
		var prod = productById( state.selectedProduct );
		var chips = quickReplies.map( function ( qr ) {
			return chip( 'pill', '', qr.label, function () { sendMessage( qr.question ); } );
		} );
		if ( prod && prod.brochure ) {
			chips.push( chip( 'brochure', ICON.fileText( 13 ), cfg.brochureLabel || 'مشاهده بروشور', function () {
				window.open( prod.brochure, '_blank', 'noopener' );
			} ) );
		}
		state.chips = chips;
	}

	function chooseAdr() {
		state.chips = [];
		pushUser( labels.adrTitle || 'ثبت عوارض', { noHistory: true } );
		pushBot( 'لطفاً دارویی که باعث عارضه شده است را انتخاب کنید:', { noHistory: true } );
		state.chips = products.map( function ( p ) {
			return chip( 'plain', ICON.activity( 18 ), p.name, function () { openAdrForm( p.id ); } );
		} );
		render();
	}

	function openAdrForm( id ) {
		state.chips = [];
		pushUser( productName( id ), { noHistory: true } );
		state.form = emptyForm();
		state.form.kind = 'adr';
		state.form.productName = productName( id );
		state.formOpenedAt = Date.now();
		state.items.push( { kind: 'form', formKind: 'adr', noHistory: true } );
		render();
	}

	function chooseConsult() {
		state.chips = [];
		pushUser( labels.consultTitle || 'درخواست مشاوره', { noHistory: true } );
		state.form = emptyForm();
		state.form.kind = 'consult';
		state.formOpenedAt = Date.now();
		state.items.push( { kind: 'form', formKind: 'consult', noHistory: true } );
		render();
	}

	function restart() {
		startConversation();
		render();
	}

	/* ---------- ارسال پیام (چت AI) ---------- */
	function sendMessage( text ) {
		if ( ! text || ! text.trim() || state.isLoading ) { return; }

		// اگر هنوز موضوعی انتخاب نشده، به دستیار عمومی وصل شو.
		if ( ! state.selectedProduct ) {
			state.selectedProduct = companyInfo.id;
		}

		// تاریخچه واقعی (پیام‌های ناوبری حذف می‌شوند).
		var history = state.items
			.filter( function ( it ) { return ( it.kind === 'bot' || it.kind === 'user' ) && ! it.noHistory; } )
			.map( function ( it ) { return { role: it.kind === 'bot' ? 'assistant' : 'user', content: it.content }; } );
		while ( history.length && history[ 0 ].role === 'assistant' ) { history.shift(); }

		state.chips = [];
		pushUser( text );
		state.isLoading = true;
		render();

		ajax( 'nafas_chatbot_chat', {
			message: text,
			product: state.selectedProduct,
			history: JSON.stringify( history )
		} ).then( function ( res ) {
			state.isLoading = false;
			var reply;
			if ( res.ok && res.json && res.json.success ) {
				reply = res.json.data.reply || 'متاسفانه مشکلی در دریافت پاسخ پیش آمد.';
			} else {
				reply = errorMessage( res );
			}
			pushBot( reply );
			// در گفتگوی محصول، چیپس‌های پیشنهادی را دوباره نشان بده.
			if ( state.selectedProduct && state.selectedProduct !== companyInfo.id ) {
				setProductQuickReplies();
			}
			render();
		} ).catch( function () {
			state.isLoading = false;
			pushBot( 'خطا در ارتباط با سرور. لطفاً اتصال اینترنت خود را بررسی کنید.' );
			render();
		} );
	}

	/* ---------- ارسال فرم ---------- */
	function submitForm() {
		if ( state.isLoading ) { return; }
		var isAdr = state.form.kind === 'adr';
		state.isLoading = true;
		render();

		var payload = {
			type: isAdr ? 'گزارش عوارض دارویی' : 'درخواست مشاوره',
			name: state.form.name,
			phone: state.form.phone,
			description: state.form.description,
			nfx_hp: state.form.hp || '',
			nfx_elapsed: Date.now() - ( state.formOpenedAt || 0 )
		};
		if ( isAdr ) {
			payload.product = state.form.productName;
			payload.reporter_type = state.form.reporterType;
			payload.severity = state.form.severity;
			payload.outcome = state.form.outcome;
			payload.batch_number = state.form.batchNumber;
			payload.concomitant_drugs = state.form.concomitantDrugs;
		}

		ajax( 'nafas_chatbot_submit', payload ).then( function ( res ) {
			state.isLoading = false;
			if ( res.ok && res.json && res.json.success ) {
				// حذف کارت فرم و نمایش کارت موفقیت.
				state.items = state.items.filter( function ( it ) { return it.kind !== 'form'; } );
				state.items.push( { kind: 'success', noHistory: true } );
				state.form = emptyForm();
				state.chips = [ chip( 'plain', ICON.refresh( 16 ), 'بازگشت به منوی اصلی', restart ) ];
			} else {
				toast( errorMessage( res ), true );
			}
			render();
		} ).catch( function () {
			state.isLoading = false;
			toast( 'متاسفانه در ثبت اطلاعات مشکلی پیش آمد. لطفاً اتصال اینترنت را بررسی و مجدداً تلاش کنید.', true );
			render();
		} );
	}

	/* ---------- رندر ---------- */
	function render() { renderWindow(); }

	function renderWindow() {
		win.innerHTML = '';
		win.appendChild( buildHeader() );

		var body   = el( 'div', 'nfx-body' );
		var thread = el( 'div', 'nfx-chat' );

		state.items.forEach( function ( it ) { thread.appendChild( renderItem( it ) ); } );

		if ( state.isLoading ) { thread.appendChild( typingEl() ); }
		if ( state.chips.length && ! state.isLoading ) { thread.appendChild( renderChips( state.chips ) ); }

		body.appendChild( thread );
		win.appendChild( body );
		win.appendChild( buildFooter() );

		scrollToBottom();
	}

	function buildHeader() {
		var h = el( 'div', 'nfx-header' );
		h.appendChild( el( 'div', 'nfx-header__icon', ICON.bot( 24 ) ) );
		var texts = el( 'div', 'nfx-header__texts' );
		texts.appendChild( el( 'h3', 'nfx-header__title', escapeHtml( cfg.headerTitle || 'دستیار هوشمند' ) ) );
		texts.appendChild( el( 'p', 'nfx-header__sub', '<i></i>آنلاین' ) );
		h.appendChild( texts );

		var restartBtn = el( 'button', 'nfx-header__restart', ICON.refresh( 18 ) );
		restartBtn.setAttribute( 'aria-label', 'شروع دوباره' );
		restartBtn.title = 'منوی اصلی';
		restartBtn.addEventListener( 'click', restart );
		h.appendChild( restartBtn );

		h.appendChild( el( 'div', 'nfx-header__sparkle', ICON.sparkles( 96 ) ) );
		return h;
	}

	function renderItem( it ) {
		if ( it.kind === 'bot' ) {
			var b = el( 'div', 'nfx-msg nfx-msg--bot' );
			b.innerHTML = '<span class="nfx-msg__avatar">' + ICON.bot( 16 ) + '</span>' +
				'<div class="nfx-msg__bubble">' + boldify( it.content ) + '</div>';
			return b;
		}
		if ( it.kind === 'user' ) {
			var u = el( 'div', 'nfx-msg nfx-msg--user' );
			u.innerHTML = '<span class="nfx-msg__avatar">' + ICON.user( 16 ) + '</span>' +
				'<div class="nfx-msg__bubble">' + escapeHtml( it.content ) + '</div>';
			return u;
		}
		if ( it.kind === 'form' ) {
			return renderFormCard( it.formKind );
		}
		if ( it.kind === 'success' ) {
			return renderSuccessCard();
		}
		return el( 'div' );
	}

	function typingEl() {
		var t = el( 'div', 'nfx-msg nfx-msg--bot' );
		t.innerHTML = '<span class="nfx-msg__avatar">' + ICON.bot( 16 ) + '</span>' +
			'<div class="nfx-typing"><span></span><span></span><span></span></div>';
		return t;
	}

	function renderChips( chips ) {
		var wrap = el( 'div', 'nfx-chipset' );
		chips.forEach( function ( c ) {
			var btn;
			if ( c.color === 'pill' || c.color === 'brochure' ) {
				btn = el( 'button', 'nfx-qr-chip' + ( c.color === 'brochure' ? ' nfx-qr-chip--brochure' : '' ) );
				btn.innerHTML = ( c.icon || '' ) + '<span>' + escapeHtml( c.label ) + '</span>';
			} else {
				btn = el( 'button', 'nfx-opt-chip nfx-opt-chip--' + c.color );
				btn.innerHTML = ( c.icon ? '<span class="nfx-opt-chip__icon">' + c.icon + '</span>' : '' ) +
					'<span class="nfx-opt-chip__label">' + escapeHtml( c.label ) + '</span>' +
					'<span class="nfx-opt-chip__chevron">' + ICON.chevronLeft( 16 ) + '</span>';
			}
			btn.type = 'button';
			btn.addEventListener( 'click', c.onClick );
			wrap.appendChild( btn );
		} );
		// چیپس‌های pill در یک ردیف افقی.
		if ( chips.length && ( chips[ 0 ].color === 'pill' || chips[ 0 ].color === 'brochure' ) ) {
			wrap.classList.add( 'nfx-chipset--pills' );
		}
		return wrap;
	}

	/* ---------- کارت فرم داخل چت ---------- */
	function renderFormCard( kind ) {
		var isAdr = kind === 'adr';
		var card  = el( 'div', 'nfx-msg nfx-msg--bot' );
		var inner = el( 'div', 'nfx-formcard' );

		var title = isAdr ? 'فرم ثبت گزارش عارضه' : 'فرم درخواست مشاوره';
		inner.appendChild( el( 'div', 'nfx-formcard__title', ( isAdr ? ICON.activity( 16 ) : ICON.headphones( 16 ) ) + '<span>' + escapeHtml( title ) + '</span>' ) );

		if ( isAdr && state.form.productName ) {
			inner.appendChild( el( 'div', 'nfx-formcard__note', 'داروی مرتبط: <b>' + escapeHtml( state.form.productName ) + '</b>' ) );
		}

		var form = el( 'form', 'nfx-form' );

		// تله Honeypot (نامرئی) — کاربر واقعی پر نمی‌کند.
		var hp = el( 'input', 'nfx-hp' );
		hp.type = 'text';
		hp.name = 'nfx_hp';
		hp.tabIndex = -1;
		hp.setAttribute( 'autocomplete', 'off' );
		hp.setAttribute( 'aria-hidden', 'true' );
		hp.value = state.form.hp || '';
		hp.addEventListener( 'input', function () { state.form.hp = hp.value; } );
		form.appendChild( hp );

		form.appendChild( field( 'name', ICON.user( 14 ) + ' نام و نام خانوادگی', 'text', 'مثلا: علی احمدی', false, true ) );
		form.appendChild( field( 'phone', ICON.phone( 14 ) + ' شماره تماس', 'tel', '0912...', true, true ) );

		if ( isAdr && adrOptions.reporter_type && adrOptions.reporter_type.length ) {
			form.appendChild( selectField( 'reporterType', ICON.user( 14 ) + ' نوع گزارش‌دهنده', adrOptions.reporter_type, 'انتخاب کنید...' ) );
		}

		var descLabel = isAdr ? ' شرح عارضه مشاهده‌شده' : ' موضوع و خلاصه درخواست';
		var descPh    = isAdr ? 'علائم و مشکلاتی که پس از مصرف دارو پیش آمد را با جزئیات بنویسید...' : 'به‌صورت خلاصه بنویسید در چه موردی نیاز به مشاوره دارید...';
		var fDesc = el( 'div', 'nfx-field' );
		fDesc.appendChild( el( 'label', 'nfx-field__label', ICON.fileText( 14 ) + escapeHtml( descLabel ) ) );
		var ta = el( 'textarea', 'nfx-textarea' );
		ta.rows = 3; ta.required = true; ta.placeholder = descPh; ta.value = state.form.description;
		ta.addEventListener( 'input', function () { state.form.description = ta.value; } );
		fDesc.appendChild( ta );
		form.appendChild( fDesc );

		if ( isAdr ) {
			var grid = el( 'div', 'nfx-grid2' );
			if ( adrOptions.severity && adrOptions.severity.length ) {
				grid.appendChild( selectField( 'severity', ICON.activity( 14 ) + ' شدت', adrOptions.severity, 'انتخاب...' ) );
			}
			if ( adrOptions.outcome && adrOptions.outcome.length ) {
				grid.appendChild( selectField( 'outcome', ICON.check( 14 ) + ' پیامد', adrOptions.outcome, 'انتخاب...' ) );
			}
			if ( grid.children.length ) { form.appendChild( grid ); }
			form.appendChild( field( 'batchNumber', ICON.fileText( 14 ) + ' شماره سری ساخت — اختیاری', 'text', 'روی بسته دارو', true, false ) );
		}

		var btn = el( 'button', 'nfx-submit ' + ( isAdr ? 'nfx-submit--red' : 'nfx-submit--purple' ) );
		btn.type = 'submit'; btn.disabled = state.isLoading;
		btn.innerHTML = ( state.isLoading ? '<span class="nfx-spin">' + ICON.loader( 18 ) + '</span>' : ICON.check( 18 ) ) +
			'<span>' + ( isAdr ? 'ثبت گزارش عوارض' : 'ثبت درخواست' ) + '</span>';
		form.appendChild( btn );

		form.addEventListener( 'submit', function ( e ) { e.preventDefault(); submitForm(); } );
		inner.appendChild( form );
		card.innerHTML = '<span class="nfx-msg__avatar">' + ICON.bot( 16 ) + '</span>';
		card.appendChild( inner );
		return card;
	}

	function field( key, labelHtml, type, ph, ltr, required ) {
		var f = el( 'div', 'nfx-field' );
		f.appendChild( el( 'label', 'nfx-field__label', labelHtml ) );
		var inp = el( 'input', 'nfx-input' + ( ltr ? ' nfx-input--ltr' : '' ) );
		inp.type = type;
		inp.required = ( required !== false );
		inp.placeholder = ph;
		inp.value = state.form[ key ];
		inp.addEventListener( 'input', function () { state.form[ key ] = inp.value; } );
		f.appendChild( inp );
		return f;
	}

	function selectField( key, labelHtml, options, ph ) {
		var f = el( 'div', 'nfx-field' );
		f.appendChild( el( 'label', 'nfx-field__label', labelHtml ) );
		var sel = el( 'select', 'nfx-input nfx-select' );
		var o0 = el( 'option' ); o0.value = ''; o0.textContent = ph || 'انتخاب کنید...'; sel.appendChild( o0 );
		options.forEach( function ( opt ) {
			var o = el( 'option' ); o.value = opt; o.textContent = opt;
			if ( state.form[ key ] === opt ) { o.selected = true; }
			sel.appendChild( o );
		} );
		sel.addEventListener( 'change', function () { state.form[ key ] = sel.value; } );
		f.appendChild( sel );
		return f;
	}

	function renderSuccessCard() {
		var card = el( 'div', 'nfx-msg nfx-msg--bot' );
		var inner = el( 'div', 'nfx-success-card' );
		inner.innerHTML =
			'<div class="nfx-success-card__icon">' + ICON.check( 28 ) + '</div>' +
			'<div class="nfx-success-card__title">ثبت موفقیت‌آمیز بود</div>' +
			'<div class="nfx-success-card__text">اطلاعات شما با موفقیت ثبت شد. کارشناسان ما در اسرع وقت با شما تماس می‌گیرند.</div>';
		card.innerHTML = '<span class="nfx-msg__avatar">' + ICON.bot( 16 ) + '</span>';
		card.appendChild( inner );
		return card;
	}

	/* ---------- ورودی ثابت پایین ---------- */
	function buildFooter() {
		var foot = el( 'form', 'nfx-chat-foot' );
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
		if ( cfg.disclaimer ) {
			foot.appendChild( el( 'p', 'nfx-disclaimer', escapeHtml( cfg.disclaimer ) ) );
		}
		foot.addEventListener( 'submit', function ( e ) {
			e.preventDefault();
			var val = input.value;
			if ( ! val.trim() ) { return; }
			input.value = '';
			sendMessage( val );
		} );
		// فوکوس خودکار فقط در حالت گفتگوی آزاد (نه روی گزینه‌ها/فرم — تا کیبورد موبایل ناخواسته باز نشود).
		var hasForm = state.items.some( function ( it ) { return it.kind === 'form'; } );
		if ( ! state.isLoading && ! state.chips.length && ! hasForm && state.items.length ) {
			setTimeout( function () { try { input.focus( { preventScroll: true } ); } catch ( e ) { input.focus(); } }, 60 );
		}
		return foot;
	}

	function scrollToBottom() {
		var body = win.querySelector( '.nfx-body' );
		if ( body ) { body.scrollTop = body.scrollHeight; }
	}

} )();
