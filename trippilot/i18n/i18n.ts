export type Locale =
  | "en"
  | "zh"
  | "ja"
  | "ko"
  | "fr"
  | "es"
  | "de"
  | "pt"
  | "ru";

export const DEFAULT_LOCALE: Locale = "en";

type NonPrimaryLocale = Exclude<Locale, "en" | "zh">;

// Translation dictionary keyed by the English string used in `l(zh, en)`.
// This lets the app support more system languages without changing call sites.
const TRANSLATIONS: Record<NonPrimaryLocale, Record<string, string>> = {
  ja: {
    Login: "ログイン",
    Account: "アカウント",
    "My Trips": "マイ旅行",
    "Save to My Trips": "マイ旅行に保存",
    "Save this route to My Trips": "このルートをマイ旅行に保存",
    "Saved locally on this device (cloud permission blocked)":
      "この端末にローカル保存しました（クラウド権限がブロックされました）",
    "Saved (Local)": "保存済み（ローカル）",
    Saved: "保存済み",
    Saving: "保存中",
    Failed: "失敗",
    Share: "共有",
    "Share & publish": "共有と公開",
    "Copy share link": "共有リンクをコピー",
    "Link copied": "リンクをコピーしました",
    "Copy failed": "コピーに失敗しました",
    "Export calendar (.ics)": "カレンダーを書き出す（.ics）",
    "Add to Google Calendar": "Google カレンダーに追加",
    "Publish to Community": "コミュニティに公開",
    "Publishing...": "公開中...",
    Published: "公開済み",
    Unpublish: "公開を取り消す",
    "Unpublish this from Community?":
      "この投稿をコミュニティから取り消しますか？",
    "Failed to load saved trips": "保存した旅行の読み込みに失敗しました",
    "Sign in to view/manage saved trips": "ログインして保存済み旅行を表示/管理",
    "Signed in · Cloud sync": "ログイン済み · クラウド同期",
    "Signed in · Local data": "ログイン済み · ローカルデータ",
    "Sign in to sync to cloud": "ログインしてクラウドに同期",
    "Sign in to sync": "ログインして同期",
    "Sign in": "ログイン",
    Refresh: "更新",
    "Loading…": "読み込み中…",
    "Please sign in": "ログインしてください",
    Close: "閉じる",
    "Signed in as: ": "ログイン中: ",
    "Sign out": "ログアウト",
    "Firebase sign-in (syncs to the cloud)":
      "Firebase ログイン（クラウドに同期）",
    "Popup blocked? Allow pop-ups with these steps":
      "ポップアップがブロックされましたか？以下の手順で許可してください",
    "1) Click the lock/site icon on the left of the address bar":
      "1) アドレスバー左の「鍵/サイト」アイコンをクリック",
    "2) Open “Site settings”": "2) 「サイトの設定」を開く",
    "3) Set “Pop-ups / Pop-ups and redirects” to Allow":
      "3) 「Pop-ups / Pop-ups and redirects」を Allow に設定",
    "4) Refresh and try “Continue with Google (popup)” again":
      "4) 更新して「Google で続行（ポップアップ）」を再試行",
    "Anonymous account (you can link Google later)":
      "匿名アカウント（後で Google をリンク可能）",
    "Tip: signing in syncs your trips to Firestore.":
      "ヒント：ログインすると旅行が Firestore に同期されます。",
    "Continue with Google (popup)": "Google で続行（ポップアップ）",
    "If the popup didn’t appear, allow pop-ups":
      "ポップアップが表示されない場合は、ポップアップを許可してください",
    "Address bar icon → Site settings → Pop-ups (and redirects) → Allow.":
      "アドレスバー左のアイコン → サイトの設定 → Pop-ups（and redirects）→ Allow",
    "Open the step-by-step guide (desktop & mobile browsers)":
      "図解ガイドを見る（PC/スマホ各ブラウザ）",
    "Continue as guest (link later)": "ゲストとして続行（後でリンク可）",
    "Back to Home": "ホームに戻る",
    "No saved trips yet": "保存済みの旅行はまだありません",
    "Plan a route": "ルートを作成",
    Updated: "更新",
    "Open this plan": "このプランを開く",
    Open: "開く",
    Delete: "削除",
    "Delete this saved trip?": "この保存済み旅行を削除しますか？",
    "My Trips is only available to signed-in users, so you can save and manage multiple routes in the cloud.":
      "マイ旅行はログインユーザーのみ利用できます。クラウドに複数のルートを保存して管理できます。",
    "Go to the Route results page and click “Save” — it will show up here (you can save multiple).":
      "ルート結果ページで「Save」をクリックするとここに表示されます（複数保存できます）。",
    Explore: "探索",
    "Nearby attractions": "近くの観光スポット",
    "Nearby cafes": "近くのカフェ",
    "Nearby restaurants": "近くのレストラン",
    "Coffee break": "休憩",
    "Setup Required": "設定が必要です",
    Cancel: "キャンセル",
    "My location": "現在地",
    "Start Location": "出発地",
    "Tip: Use a city or specific place; flights aren't supported.":
      "ヒント：都市名または具体的な地点がおすすめです。飛行機のルートには対応していません。",
    "View all": "すべて表示",
    Retry: "再試行",
    "View error details": "エラー詳細を見る",
    "Gemini suggestions unavailable: ": "Gemini のおすすめが利用できません: ",
    "Generating with Gemini...": "Gemini で生成中...",
    "Enter start location first...": "最初に出発地を入力してください...",
    "Add destination...": "目的地を追加...",
    "Add destination... (set a start location first)":
      "目的地を追加...（先に出発地を設定してください）",
    Community: "コミュニティ",
    "Community picks": "コミュニティのおすすめ",
    "See what others planned — reuse in one click.":
      "他の人の旅程を参考に、ワンクリックで取り込めます。",
    "Publish your trips so others can discover and reuse them.":
      "自分の旅程を公開して、ほかの人が見つけて使えるようにしましょう。",
    "Search community trips...": "コミュニティの旅程を検索...",
    "Total: ": "合計: ",
    "No community trips yet": "公開された行程はまだありません",
    "Go to route results": "ルート結果へ",
    "No matching trips": "一致する行程がありません",
    "Try another keyword.": "別のキーワードを試してください。",
    "(No description)": "（説明なし）",
    Original: "元のタイトル",
    By: "作成者",
    "Copy link": "リンクをコピー",
    Copied: "コピー済み",
    "Go to a route and use Share → Publish to Community.":
      "ルート結果で「共有 → コミュニティに公開」を使ってください。",
    "This shared trip is invalid.": "この共有データは無効です。",
    "Failed to open": "開くのに失敗しました",
    "Failed to load": "読み込みに失敗しました",
    "Delete this community post?": "この投稿を削除しますか？",
    "You don't have permission to delete this post.":
      "この投稿を削除する権限がありません。",
    "Failed to delete": "削除に失敗しました",
    "Don't show again": "今後表示しない",
    "Loading...": "読み込み中...",
    "No community trips yet — publish the first one.":
      "公開された行程はまだありません。最初の投稿をしてみましょう。",
    "Browse Community": "コミュニティを見る",
    "Publish mine": "自分の旅程を公開",
    "Published to Community": "コミュニティに公開しました",
    "Others can now view and reuse your trip.":
      "他のユーザーがあなたの旅程を閲覧・再利用できるようになりました。",
    "View Community": "コミュニティを見る",
    "Got it": "OK",
    "Optimize & Plan": "最適化して計画",
    "Add at least 2 places": "少なくとも 2 か所追加してください",
    Stops: "立ち寄り先",
    "Route Result": "ルート結果",
    "Optimizing & calculating route...": "ルートを最適化・計算中...",
    "Transit Unavailable": "公共交通が利用できません",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "一部区間で公共交通が見つからず、徒歩に切り替えました。（例：深夜や郊外）",
    "View Full Steps": "すべての手順を見る",
    "Optimized Itinerary": "最適化された行程",
    Towards: "方面",
    "Transit simplified by Google": "Google により簡略化された公共交通",
    "Short distance or best connected by walk":
      "距離が短い、または徒歩が最適です",
    Walk: "徒歩",
    "Walk (Transit Unavailable)": "徒歩（公共交通なし）",
    Drive: "車",
    Destination: "目的地",
    "To:": "行き先:",
    "Trip Plan": "旅行プラン",
    "Optimized Route": "最適化ルート",
    Recompute: "再計算",
    "Recompute routes": "ルートを再計算",
    "Weather Now": "現在の天気",
    "Local Weather": "現地の天気",
    "Publish title:": "公開タイトル:",
    "Optional: add a short public description": "任意：公開用の短い説明を追加",
    "Open in Google Maps": "Google マップで開く",
    "Edit in Home": "ホームで編集",
    "No stops yet.": "まだ地点がありません。",
    Start: "出発",
    "Edit start": "出発地を編集",
    "Remove start": "出発地を削除",
    "Edit start location...": "出発地を編集...",
    Edit: "編集",
    Remove: "削除",
    "Edit stop": "地点を編集",
    "Remove stop": "地点を削除",
    "Trip assistant (chat)": "旅行アシスタント（チャット）",
    "Trip text → actionable plan (click to add)":
      "旅行メモ → 実行可能な計画（クリックで追加）",
    Chat: "チャット",
    Plan: "プラン",
    Clear: "クリア",
    Confirm: "確認",
    "Thinking...": "考え中...",
    "Type a message...": "メッセージを入力...",
    Send: "送信",
    "Enter to send · Shift+Enter for newline":
      "Enter で送信 · Shift+Enter で改行",
    "Suggested: ": "滞在目安: ",
    Added: "追加済み",
    Add: "追加",
    Stop: "停止",
    Transcribing: "認識中",
    Voice: "音声",
    "Stop recording": "録音停止",
    Hold: "長押し",
    Release: "離す",
    "Release to stop": "離して停止",
    "Hold to talk (Gemini speech-to-text)": "長押しで話す（Gemini 音声認識）",
    "Transcribing...": "認識中...",
    "Listening... release to stop": "聴き取り中... 離して停止",
    "Hold to talk, release to transcribe": "長押しで話す、離すと認識",
    "Use Gemini speech-to-text (microphone access required)":
      "Gemini 音声認識を使用（マイク権限が必要）",
    "Speech-to-text output language (auto keeps original)":
      "音声認識の出力言語（auto は元の言語を維持）",
    "Voice: Auto": "音声: 自動",
    Chinese: "中国語",
    "Voice language: Auto": "音声言語: 自動",
    "Generate itinerary plan": "旅程プランを生成",
    Generating: "生成中",
    "Generate plan": "プラン生成",
    "Plan results (click a place → adds to your destinations)":
      "結果（場所をクリックすると目的地に追加）",
    "City: ": "都市: ",
    "Reset added": "追加済みをリセット",
    "Clear added markers so you can add again":
      "追加済みマークを消して再度追加できるようにします",

    "Unknown location": "不明な場所",
    "Signed in: ": "ログイン中: ",
    "Your Itinerary": "旅程",
    "Clear all": "すべてクリア",
    "Search and add places to build your trip.":
      "検索して場所を追加し、旅程を作成しましょう。",
    "Opening hours: ": "営業時間: ",
    "Today: ": "本日: ",
    "Tips: ": "ヒント: ",
    "Add at least one place!": "少なくとも 1 か所追加してください！",
    "Generate Route": "ルートを生成",
    "No specific place found — I filled the search box so you can pick.":
      "具体的な場所が見つかりませんでした。検索欄に入力したので選択してください。",
    "Add failed — I filled the search box so you can pick.":
      "追加に失敗しました。検索欄に入力したので選択してください。",

    "Maximum of 10 stops allowed.": "立ち寄り先は最大 10 か所までです。",
    "Please add at least 2 places.": "少なくとも 2 か所追加してください。",
    "Enter start location...": "出発地を入力…",
    "Add / remove stops then route recalculates automatically.":
      "立ち寄り先を追加/削除するとルートが自動で再計算されます。",

    "Trending Attractions": "人気スポット",
    "Your Trip": "あなたの旅行",
    "No places added yet.": "まだ場所が追加されていません。",
    "Start by adding a location above.":
      "まずは上の検索から場所を追加してください。",
    "Est. Duration": "推定所要時間",

    "Gemini suggestion": "Gemini のおすすめ",
    "Why: ": "理由: ",
    "Category: ": "カテゴリ: ",
    Transit: "公共交通",
    Walking: "徒歩",
    Driving: "車",
    "vs previous run": "前回と比較",
    "Time: ": "時間: ",
    "Distance: ": "距離: ",
    "Stops: ": "立ち寄り先: ",
    "No change": "変更なし",
    "+{minutes} min": "+{minutes}分",
    "-{minutes} min": "-{minutes}分",
    "+{km} km": "+{km}km",
    "-{km} km": "-{km}km",
    "Suggested time: ": "滞在目安: ",
    "Add to Trip": "旅行に追加",

    "Historic site": "史跡",
    Landmark: "ランドマーク",
    Museum: "博物館",
    "Art gallery": "美術館",
    Nature: "自然",
    Park: "公園",
    "Street / walk": "街歩き",
    Food: "グルメ",
    Shopping: "ショッピング",
    "Night view": "夜景",
    Relaxation: "リラックス",
    Attraction: "観光スポット",
    "Place of worship": "宗教施設",

    "Hours: ": "営業時間: ",

    "Tickets: free": "入場料: 無料",
    "Tickets: usually free / donation": "入場料: たいてい無料 / 寄付",
    "Tickets: required (book ahead recommended)":
      "入場料: 必要（事前予約推奨）",
    "Tickets: may be required (check official site/on-site)":
      "入場料: 必要な場合あり（公式サイトまたは現地で要確認）",
    "Tickets: ~ ": "入場料: 約 ",
    " (estimate)": "（目安）",

    "Typical spend: ": "目安の費用: ",
    "Typical spend: not provided (check menu/reviews)":
      "目安の費用: 未提供（メニュー/レビュー参照）",
    "Free / almost free": "無料/ほぼ無料",
    Budget: "安め",
    Moderate: "普通",
    Pricey: "やや高め",
    "Very expensive": "高め",
    "Recently Viewed": "最近表示",
    "No recently viewed places yet. Try searching and adding a place.":
      "最近表示した場所はまだありません。検索して追加してみてください。",
    "No suggestions yet (set a start location or retry).":
      "おすすめがまだありません（出発地を設定するか再試行してください）。",
    "Retry Gemini suggestions": "Gemini のおすすめを再試行",
    "From idea to itinerary, ready to go": "アイデアから旅程まで、すぐに出発",
    "What makes it different?":
      "他の旅行アプリや一般的なチャットボットと何が違う？",
    "Reality-aware planning": "現実条件を考慮",
    "Considers weather, opening hours, and distance to keep plans feasible.":
      "天気・営業時間・距離を考慮して、無理のないプランにします。",
    "Not just a chatbot": "ただのチャットではない",
    "Returns specific places you can click to add — not vague advice.":
      "具体的な場所を提示し、クリックで旅程に追加できます（曖昧な助言だけではありません）。",
    "Route comparison & optimization": "ルート比較＆最適化",
    "Generate and compare driving, walking, and transit routes in one click.":
      "車・徒歩・公共交通のルートをワンクリックで生成・比較できます。",
    "First time here? Get value in 30 seconds":
      "初めての方へ：30秒で使い方が分かる",
    "Paste your trip idea (city/days/preferences) — AI turns it into a clickable itinerary":
      "旅行のアイデア（都市/日数/好み）を貼り付けると、AI がクリックで追加できる旅程に変換します",
    "Add start + destinations — generate and compare routes (incl. transit)":
      "出発地と目的地を追加して、ルートを生成・比較（公共交通も対応）",
    "Weather/opening-hours awareness with indoor alternatives":
      "天気/営業時間を考慮し、屋内の代替案も提案します",
    Onboarding: "新手ガイド",
    "Paste your idea": "アイデアを貼り付け",
    "Add places": "地点を追加",
    "Generate route": "ルートを生成",
    "Paste your trip idea into “Chat/Plan” below — click results to add to your trip.":
      "下の「チャット/プラン」に旅行のアイデアを貼り付けて、結果をクリックして旅程に追加します。",
    "Add a start location, then at least 1 destination.":
      "出発地を入力してから、少なくとも 1 つの目的地を追加してください。",
    "Click “Optimize & Plan” to generate and compare routes.":
      "「最適化して計画」をクリックしてルートを生成・比較します。",
    "Go to step 1": "ステップ 1 へ",
    "Go to step 2": "ステップ 2 へ",
    "Go to step 3": "ステップ 3 へ",
    // Back, Next, Done, Skip are already defined as translation keys elsewhere. Remove duplicates.
    "Copy a sample prompt": "サンプル文をコピー",
    "Take me to start": "開始位置へ移動",
    "Copied sample — paste it anywhere":
      "サンプルをコピーしました。貼り付けて使えます",
    Dismiss: "閉じる",
    Departure: "出発",
    "Departure time": "出発時刻",
    "Recommended searches": "おすすめ検索",
    "Reason: ": "理由: ",
    "Weather: loading…": "天気: 読み込み中…",
    "Weather: ": "天気: ",
    "Precip ": "降水 ",
    "Wind ": "風 ",
    "Cloudy ": "くもり ",
    "Alternatives: loading…": "代替案: 読み込み中…",
    "Show nearby indoor alternatives": "近くの屋内候補を見る",
    "Weather is mixed — see nearby indoor alternatives":
      "天候が微妙です。近くの屋内候補を見ましょう",
    "Search for a place...": "場所を検索…",

    "Generate a plan from text": "テキストからプラン生成",
    "Click again to confirm": "もう一度クリックして確認",
    "Clear chat (confirmation required)": "チャットをクリア（確認が必要）",
    "Type/paste your trip notes...": "旅行メモを入力/貼り付け…",
    "(Failed to parse generated result)": "（生成結果を解析できませんでした）",
    "(No content)": "（内容なし）",
    "Chat failed. Please check your Gemini key or network.\n":
      "チャットに失敗しました。Gemini キーまたはネットワークを確認してください。\n",
    "No usable plan was generated. Try rephrasing (adding city/days helps).":
      "使えるプランが生成されませんでした。言い換えてみてください（都市/日数を入れると精度が上がります）。",
    "Generation failed. Please check your Gemini key or network.":
      "生成に失敗しました。Gemini キーまたはネットワークを確認してください。",
    "Could not start recording: please allow microphone access or try another browser.":
      "録音を開始できませんでした。マイク権限を許可するか、別のブラウザをお試しください。",
    "Recording failed. Please check browser permissions.\n(Microphone access is required)":
      "録音に失敗しました。ブラウザの権限を確認してください。\n（マイクの許可が必要です）",
    "I can plan your trip in a multi-turn chat. Tell me: city, days, preferences, must-sees, budget/transport.":
      "複数ターンのチャットで旅程を一緒に計画できます。都市、日数、好み、必須スポット、予算/交通手段を教えてください。",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      '旅行のアイデアを貼り付けてください：都市/日数/好み/必須スポット。例：\n"ローマで2日、博物館と建築が好きで、夜景も見たい"',

    "Order auto-optimized": "順序を自動最適化しました",
    "To be faster and more feasible, the system may reorder your stops.":
      "所要時間を短くし実現可能にするため、システムが立ち寄り先の順序を並べ替えることがあります。",
    "Why?": "なぜ？",
    "Why this order?": "なぜこの順序？",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "全体の所要時間が短くなり、閉店後や営業時間に間に合わないケースを避けるようにしています。",
    "This is usually faster overall.":
      "全体の所要時間が短くなるように並べ替えました。",
    "Current order: ": "現在の順序: ",
    "Order adjusted (click to see why)": "順序変更あり（タップで理由を表示）",
    "- Based on: ": "- 根拠: ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " ＋ 出発時刻（交通状況／ダイヤ）から各区間を見積もり、合計距離／時間を最小化。",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- さらに: 営業時間と推奨滞在時間を考慮し、閉店後の到着を回避。",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- AI 提案: リスクがある場合、より実現可能な順序を検討（移動時間は地図ベース）。",
    "- Current order: ": "- 現在の順序: ",
    Collapse: "閉じる",
    "May be too tight / closed (goal: visit as much as possible)":
      "時間が足りない／閉店の可能性（目標: できるだけ全箇所を回る）",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "出発時刻＋区間の移動時間＋推奨滞在時間＋本日の営業時間で試算しました。すべての地点を残したまま、まず以下の調整をお試しください：",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "提案：少なくとも {minutes} 分早く出発（最も厳しい超過をカバー）。",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      "提案：「{placeName}」の滞在を約 {minutes} 分短縮。",
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      "補足：「本日休業」と表示される地点があります。早く出発しても解決しません。別の日にするか、近くの代替候補に変更してください。",
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "小技：閉店が早い場所を前半にすると、全部回りやすいです。",
    closes: "閉店",
    "closed today": "本日休業",
  },
  ko: {
    Login: "로그인",
    "My Trips": "내 여행",
    "Save to My Trips": "내 여행에 저장",
    "Save this route to My Trips": "이 경로를 내 여행에 저장",
    "Saved locally on this device (cloud permission blocked)":
      "이 기기에 로컬로 저장됨(클라우드 권한이 차단됨)",
    "Saved (Local)": "저장됨(로컬)",
    Saved: "저장됨",
    Saving: "저장 중",
    Failed: "실패",
    Share: "공유",
    "Share & publish": "공유 및 게시",
    "Copy share link": "공유 링크 복사",
    "Link copied": "링크가 복사되었습니다",
    "Copy failed": "복사에 실패했습니다",
    "Export calendar (.ics)": "캘린더(.ics) 내보내기",
    "Add to Google Calendar": "Google 캘린더에 추가",
    "Publish to Community": "커뮤니티에 게시",
    "Publishing...": "게시 중...",
    Published: "게시됨",
    Unpublish: "게시 취소",
    "Unpublish this from Community?": "이 게시물을 커뮤니티에서 내릴까요?",
    Explore: "탐색",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      '여행 아이디어를 붙여 넣어 주세요: 도시/일수/취향/필수 명소. 예:\n"로마에서 2일, 박물관과 건축을 좋아하고 야경도 보고 싶어요"',
    "Setup Required": "설정 필요",
    Cancel: "취소",
    "My location": "내 위치",
    "Tip: Use a city or specific place; flights aren't supported.":
      "팁: 도시 또는 구체적인 장소를 입력하세요. 항공편 경로는 지원하지 않습니다.",
    "View all": "모두 보기",
    Retry: "재시도",
    "View error details": "오류 상세 보기",
    "Gemini suggestions unavailable: ": "Gemini 추천을 사용할 수 없음: ",
    "Generating with Gemini...": "Gemini로 생성 중...",
    "Enter start location first...": "먼저 출발지를 입력하세요...",
    "Add destination...": "목적지 추가...",
    "Add destination... (set a start location first)":
      "목적지 추가... (먼저 출발지를 설정하세요)",
    Community: "커뮤니티",
    "Community picks": "커뮤니티 추천",
    "See what others planned — reuse in one click.":
      "다른 사람들이 만든 일정을 보고 한 번에 재사용하세요.",
    "Publish your trips so others can discover and reuse them.":
      "내 일정을 공개해 다른 사용자가 찾고 재사용할 수 있게 하세요.",
    "Search community trips...": "커뮤니티 일정 검색...",
    "Total: ": "총: ",
    "No community trips yet": "아직 공개된 일정이 없어요",
    "Go to route results": "경로 결과로 이동",
    "No matching trips": "일치하는 일정이 없어요",
    "Try another keyword.": "다른 키워드로 시도해 보세요.",
    "(No description)": "(설명 없음)",
    Original: "원본 제목",
    By: "작성자",
    "Copy link": "링크 복사",
    Copied: "복사됨",
    "Go to a route and use Share → Publish to Community.":
      "경로 결과에서 ‘공유 → 커뮤니티에 게시’를 사용하세요.",
    "This shared trip is invalid.": "이 공유 데이터는 유효하지 않습니다.",
    "Failed to open": "열기에 실패했습니다",
    "Failed to load": "불러오기에 실패했습니다",
    "Delete this community post?": "이 게시물을 삭제할까요?",
    "You don't have permission to delete this post.":
      "이 게시물을 삭제할 권한이 없습니다.",
    "Failed to delete": "삭제에 실패했습니다",
    "Don't show again": "다시 보지 않기",
    "Loading...": "로딩 중...",
    "No community trips yet — publish the first one.":
      "아직 공개된 일정이 없어요. 첫 번째로 공개해 보세요.",
    "Browse Community": "커뮤니티 둘러보기",
    "Publish mine": "내 일정 공개",
    "Published to Community": "커뮤니티에 공개됨",
    "Others can now view and reuse your trip.":
      "이제 다른 사용자가 당신의 일정을 보고 재사용할 수 있어요.",
    "View Community": "커뮤니티 보기",
    "Got it": "확인",
    "Optimize & Plan": "최적화 및 계획",
    "Add at least 2 places": "최소 2곳을 추가하세요",
    Stops: "경유지",
    "vs previous run": "이전 실행 대비",
    "Time: ": "시간: ",
    "Distance: ": "거리: ",
    "Stops: ": "경유지: ",
    "No change": "변화 없음",
    "+{minutes} min": "+{minutes}분",
    "-{minutes} min": "-{minutes}분",
    "+{km} km": "+{km}km",
    "-{km} km": "-{km}km",
    "Route Result": "경로 결과",
    "Optimizing & calculating route...": "경로를 최적화 및 계산 중...",
    "Transit Unavailable": "대중교통 이용 불가",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "일부 구간에서 대중교통을 찾지 못해 도보로 전환했습니다. (예: 심야 또는 외곽 지역)",
    "View Full Steps": "전체 단계 보기",
    "Optimized Itinerary": "최적화된 일정",
    Towards: "방면",
    "Transit simplified by Google": "Google에서 단순화한 대중교통",
    "Short distance or best connected by walk":
      "거리가 짧거나 도보가 더 적합합니다",
    Walk: "도보",
    "Walk (Transit Unavailable)": "도보(대중교통 이용 불가)",
    Drive: "운전",
    Destination: "목적지",
    "To:": "도착지:",
    "Trip Plan": "여행 계획",
    "Optimized Route": "최적화된 경로",
    Recompute: "재계산",
    "Recompute routes": "경로 재계산",
    "Publish title:": "게시 제목:",
    "Optional: add a short public description":
      "선택 사항: 공개 설명을 짧게 추가",
    "Edit in Home": "홈에서 편집",
    "No stops yet.": "아직 장소가 없습니다.",
    Start: "출발",
    "Edit start": "출발지 편집",
    "Remove start": "출발지 제거",
    "Edit start location...": "출발지 편집...",
    Edit: "편집",
    Remove: "삭제",
    "Edit stop": "장소 편집",
    "Remove stop": "장소 제거",
    "Trip assistant (chat)": "여행 도우미(대화)",
    "Trip text → actionable plan (click to add)":
      "여행 메모 → 실행 가능한 계획(클릭하여 추가)",
    Chat: "대화",
    Plan: "계획",
    Clear: "비우기",
    Confirm: "확인",
    "Thinking...": "생각 중...",
    "Type a message...": "메시지를 입력하세요...",
    Send: "전송",
    "Enter to send · Shift+Enter for newline":
      "Enter로 전송 · Shift+Enter로 줄바꿈",
    "Suggested: ": "추천 체류: ",
    Added: "추가됨",
    Add: "추가",
    Stop: "중지",
    Transcribing: "인식 중",
    Voice: "음성",
    "Stop recording": "녹음 중지",
    Hold: "길게 누르기",
    Release: "놓기",
    "Release to stop": "놓으면 중지",
    "Hold to talk (Gemini speech-to-text)":
      "길게 눌러 말하기 (Gemini 음성 인식)",
    "Transcribing...": "인식 중...",
    "Listening... release to stop": "듣는 중... 놓으면 중지",
    "Hold to talk, release to transcribe": "길게 눌러 말하고, 놓으면 인식",
    "Use Gemini speech-to-text (microphone access required)":
      "Gemini 음성 인식 사용(마이크 권한 필요)",
    "Speech-to-text output language (auto keeps original)":
      "음성 인식 출력 언어(auto는 원어 유지)",
    "Voice: Auto": "음성: 자동",
    Chinese: "중국어",
    "Voice language: Auto": "음성 언어: 자동",
    "Generate itinerary plan": "여행 일정 생성",
    Generating: "생성 중",
    "Generate plan": "계획 생성",
    "Plan results (click a place → adds to your destinations)":
      "결과(장소 클릭 → 목적지에 추가)",
    "City: ": "도시: ",
    "Reset added": "추가됨 초기화",
    "Clear added markers so you can add again":
      "추가됨 표시를 지워 다시 추가할 수 있게 합니다",

    "Order auto-optimized": "순서 자동 최적화 완료",
    "To be faster and more feasible, the system may reorder your stops.":
      "소요 시간을 줄이고 실현 가능하도록 시스템이 경유지 순서를 변경할 수 있습니다.",
    "Why?": "왜?",
    "Why this order?": "왜 이 순서인가요?",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "전체 소요 시간이 짧아지고, 영업 종료 후 도착을 피하도록 조정했습니다.",
    "This is usually faster overall.":
      "전체 소요 시간이 짧아지도록 순서를 조정했습니다.",
    "Current order: ": "현재 순서: ",
    "Order adjusted (click to see why)": "순서 변경됨 (탭하여 이유 보기)",
    "- Based on: ": "- 근거: ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " + 출발 시간(교통 상황/시간표)으로 각 구간을 추정하고 총 거리/시간을 최소화.",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- 추가: 영업시간과 추천 체류 시간을 고려하여 영업 종료 후 도착을 방지.",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- AI 제안: 위험이 있을 경우 더 실현 가능한 순서를 시도 (이동 시간은 지도 기반).",
    "- Current order: ": "- 현재 순서: ",
    Collapse: "접기",
    "May be too tight / closed (goal: visit as much as possible)":
      "시간 부족 / 영업 종료 가능성 (목표: 최대한 많은 곳 방문)",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "출발 시각 + 구간 이동 시간 + 추천 체류 시간 + 오늘의 영업시간으로 추정했습니다. 모든 경유지를 유지하면서 다음 조정을 시도해 보세요:",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "제안: 최소 {minutes}분 더 일찍 출발하세요(가장 큰 초과를 커버).",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      '제안: "{placeName}" 체류 시간을 약 {minutes}분 줄이세요.',
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      '참고: 일부 장소는 "오늘 휴무"로 표시됩니다. 더 일찍 출발해도 해결되지 않으니 날짜를 바꾸거나 근처 대안을 선택하세요.',
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "팁: 일찍 문 닫는 곳을 앞쪽에 두면 전체를 더 쉽게 맞출 수 있어요.",
    closes: "폐점",
    "closed today": "오늘 휴무",
  },
  fr: {
    Login: "Se connecter",
    "My Trips": "Mes voyages",
    "Save to My Trips": "Enregistrer dans Mes voyages",
    "Save this route to My Trips":
      "Enregistrer cet itinéraire dans Mes voyages",
    "Saved locally on this device (cloud permission blocked)":
      "Enregistré localement sur cet appareil (accès cloud bloqué)",
    "Saved (Local)": "Enregistré (local)",
    Saved: "Enregistré",
    Saving: "Enregistrement…",
    Failed: "Échec",
    Share: "Partager",
    "Share & publish": "Partager et publier",
    "Copy share link": "Copier le lien de partage",
    "Link copied": "Lien copié",
    "Copy failed": "Échec de la copie",
    "Export calendar (.ics)": "Exporter le calendrier (.ics)",
    "Add to Google Calendar": "Ajouter à Google Agenda",
    "Publish to Community": "Publier dans la communauté",
    "Publishing...": "Publication…",
    Published: "Publié",
    Unpublish: "Annuler la publication",
    "Unpublish this from Community?":
      "Retirer cette publication de la communauté ?",
    Explore: "Explorer",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      'Collez votre idée de voyage : ville/jours/préférences/incontournables. Ex. :\n"2 jours à Rome, j’aime les musées et l’architecture, et je veux voir des vues nocturnes"',
    "Setup Required": "Configuration requise",
    Cancel: "Annuler",
    "My location": "Ma position",
    "Tip: Use a city or specific place; flights aren't supported.":
      "Astuce : utilisez une ville ou un lieu précis ; les trajets en avion ne sont pas pris en charge.",
    "View all": "Tout voir",
    Retry: "Réessayer",
    "View error details": "Voir les détails de l'erreur",
    "Gemini suggestions unavailable: ": "Suggestions Gemini indisponibles : ",
    "Generating with Gemini...": "Génération avec Gemini...",
    "Enter start location first...": "Saisissez d'abord le point de départ...",
    "Add destination...": "Ajouter une destination...",
    "Add destination... (set a start location first)":
      "Ajouter une destination... (définissez d'abord un point de départ)",
    Community: "Communauté",
    "Community picks": "Sélections de la communauté",
    "See what others planned — reuse in one click.":
      "Découvrez les itinéraires des autres et réutilisez-les en un clic.",
    "Publish your trips so others can discover and reuse them.":
      "Publiez vos itinéraires pour que d'autres puissent les découvrir et les réutiliser.",
    "Search community trips...": "Rechercher dans la communauté...",
    "Total: ": "Total : ",
    "No community trips yet": "Aucun itinéraire publié pour le moment",
    "Go to route results": "Aller aux résultats d’itinéraire",
    "No matching trips": "Aucun itinéraire correspondant",
    "Try another keyword.": "Essayez un autre mot-clé.",
    "(No description)": "(Pas de description)",
    Original: "Titre original",
    By: "Par",
    "Copy link": "Copier le lien",
    Copied: "Copié",
    "Go to a route and use Share → Publish to Community.":
      "Allez sur un itinéraire puis utilisez Partager → Publier dans la communauté.",
    "This shared trip is invalid.": "Cet itinéraire partagé est invalide.",
    "Failed to open": "Impossible d'ouvrir",
    "Failed to load": "Échec du chargement",
    "Delete this community post?": "Supprimer cette publication ?",
    "You don't have permission to delete this post.":
      "Vous n'avez pas l'autorisation de supprimer cette publication.",
    "Failed to delete": "Échec de la suppression",
    "Don't show again": "Ne plus afficher",
    "Loading...": "Chargement...",
    "No community trips yet — publish the first one.":
      "Aucun itinéraire public pour l'instant — publiez le premier.",
    "Browse Community": "Parcourir la communauté",
    "Publish mine": "Publier le mien",
    "Published to Community": "Publié dans la communauté",
    "Others can now view and reuse your trip.":
      "Les autres peuvent désormais voir et réutiliser votre itinéraire.",
    "View Community": "Voir la communauté",
    "Got it": "OK",
    "Optimize & Plan": "Optimiser et planifier",
    "Add at least 2 places": "Ajoutez au moins 2 lieux",
    Stops: "Étapes",
    "vs previous run": "vs exécution précédente",
    "Time: ": "Temps : ",
    "Distance: ": "Distance : ",
    "Stops: ": "Étapes : ",
    "No change": "Aucun changement",
    "+{minutes} min": "+{minutes} min",
    "-{minutes} min": "-{minutes} min",
    "+{km} km": "+{km} km",
    "-{km} km": "-{km} km",
    "Route Result": "Résultat d’itinéraire",
    "Optimizing & calculating route...":
      "Optimisation et calcul de l’itinéraire...",
    "Transit Unavailable": "Transports en commun indisponibles",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "Certains tronçons ont été remplacés par la marche car aucun transport en commun n’a été trouvé. (ex. trop tard la nuit ou zone rurale)",
    "View Full Steps": "Voir toutes les étapes",
    "Optimized Itinerary": "Itinéraire optimisé",
    Towards: "Vers",
    "Transit simplified by Google": "Transit simplifié par Google",
    "Short distance or best connected by walk":
      "Courte distance ou mieux relié à pied",
    Walk: "Marche",
    "Walk (Transit Unavailable)": "Marche (transports indisponibles)",
    Drive: "Conduite",
    Destination: "Destination",
    "To:": "Vers :",
    "Trip Plan": "Plan de voyage",
    "Optimized Route": "Itinéraire optimisé",
    Recompute: "Recalculer",
    "Recompute routes": "Recalculer les itinéraires",
    "Publish title:": "Titre de publication :",
    "Optional: add a short public description":
      "Optionnel : ajoutez une courte description publique",
    "Edit in Home": "Modifier dans Accueil",
    "No stops yet.": "Aucune étape pour l'instant.",
    Start: "Départ",
    "Edit start": "Modifier le départ",
    "Remove start": "Supprimer le départ",
    "Edit start location...": "Modifier le point de départ...",
    Edit: "Modifier",
    Remove: "Supprimer",
    "Edit stop": "Modifier l'étape",
    "Remove stop": "Supprimer l'étape",
    "Trip assistant (chat)": "Assistant de voyage (chat)",
    "Trip text → actionable plan (click to add)":
      "Texte → plan actionnable (cliquer pour ajouter)",
    Chat: "Chat",
    Plan: "Plan",
    Clear: "Effacer",
    Confirm: "Confirmer",
    "Thinking...": "Réflexion...",
    "Type a message...": "Saisissez un message...",
    Send: "Envoyer",
    "Enter to send · Shift+Enter for newline":
      "Entrée pour envoyer · Maj+Entrée pour un retour à la ligne",
    "Suggested: ": "Durée conseillée : ",
    Added: "Ajouté",
    Add: "Ajouter",
    Stop: "Stop",
    Transcribing: "Transcription...",
    Voice: "Voix",
    "Stop recording": "Arrêter l'enregistrement",
    Hold: "Maintenir",
    Release: "Relâcher",
    "Release to stop": "Relâcher pour arrêter",
    "Hold to talk (Gemini speech-to-text)":
      "Maintenir pour parler (dictée Gemini)",
    "Transcribing...": "Transcription...",
    "Listening... release to stop": "Écoute... relâcher pour arrêter",
    "Hold to talk, release to transcribe":
      "Maintenir pour parler, relâcher pour transcrire",
    "Use Gemini speech-to-text (microphone access required)":
      "Utiliser la dictée Gemini (micro requis)",
    "Speech-to-text output language (auto keeps original)":
      "Langue de sortie (auto conserve l'original)",
    "Voice: Auto": "Voix : Auto",
    Chinese: "Chinois",
    "Voice language: Auto": "Langue vocale : Auto",
    "Generate itinerary plan": "Générer l'itinéraire",
    Generating: "Génération...",
    "Generate plan": "Générer le plan",
    "Plan results (click a place → adds to your destinations)":
      "Résultats (cliquer → ajouter aux destinations)",
    "City: ": "Ville : ",
    "Reset added": "Réinitialiser les ajouts",
    "Clear added markers so you can add again":
      "Effacer les marqueurs pour pouvoir ajouter à nouveau",

    "Order auto-optimized": "Ordre optimisé automatiquement",
    "To be faster and more feasible, the system may reorder your stops.":
      "Pour réduire le temps total et garantir la faisabilité, le système peut réorganiser vos étapes.",
    "Why?": "Pourquoi ?",
    "Why this order?": "Pourquoi cet ordre ?",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "Le temps total est généralement réduit, et l'ordre évite d'arriver après la fermeture.",
    "This is usually faster overall.":
      "L'ordre a été ajusté pour réduire le temps total.",
    "Current order: ": "Ordre actuel : ",
    "Order adjusted (click to see why)":
      "Ordre modifié (cliquez pour voir pourquoi)",
    "- Based on: ": "- Basé sur : ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " + heure de départ (trafic/horaires) pour estimer chaque tronçon et minimiser la distance/durée totale.",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- En plus : horaires d'ouverture et durée de visite conseillée pour éviter d'arriver après la fermeture.",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- Suggestion IA : essayer un ordre plus réalisable en cas de risques (toujours basé sur le temps de trajet cartographique).",
    "- Current order: ": "- Ordre actuel : ",
    Collapse: "Réduire",
    "May be too tight / closed (goal: visit as much as possible)":
      "Risque de manquer de temps / fermé (objectif : visiter un maximum)",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "Estimation basée sur l'heure de départ + temps de trajet + durée de visite conseillée + horaires d'ouverture du jour. Gardez toutes les étapes et essayez d'abord ces ajustements :",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "Suggestion : partez au moins {minutes} min plus tôt (couvre le pire dépassement).",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      'Suggestion : réduisez la durée à "{placeName}" d’environ {minutes} min.',
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      'Remarque : certains lieux indiquent "Fermé aujourd\'hui". Partir plus tôt n’aidera pas ; essayez une autre date ou des alternatives à proximité.',
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "Astuce : placez d’abord les lieux qui ferment tôt ; c’est plus facile de tout caser.",
    closes: "ferme à",
    "closed today": "fermé aujourd'hui",
  },
  es: {
    Login: "Iniciar sesión",
    "My Trips": "Mis viajes",
    Explore: "Explorar",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      'Pega tu idea de viaje: ciudad/días/preferencias/imprescindibles. Ejemplo:\n"2 días en Roma, me gustan los museos y la arquitectura, y quiero ver vistas nocturnas"',
    "Setup Required": "Se requiere configuración",
    Cancel: "Cancelar",
    "My location": "Mi ubicación",
    "Tip: Use a city or specific place; flights aren't supported.":
      "Consejo: usa una ciudad o un lugar específico; no se admiten rutas en avión.",
    "View all": "Ver todo",
    Retry: "Reintentar",
    "View error details": "Ver detalles del error",
    "Gemini suggestions unavailable: ":
      "Sugerencias de Gemini no disponibles: ",
    "Generating with Gemini...": "Generando con Gemini...",
    "Enter start location first...": "Primero ingresa el origen...",
    "Add destination...": "Agregar destino...",
    "Add destination... (set a start location first)":
      "Agregar destino... (primero define el origen)",
    Community: "Comunidad",
    "Community picks": "Destacados de la comunidad",
    "See what others planned — reuse in one click.":
      "Mira lo que otros planearon y reutilízalo con un clic.",
    "Publish your trips so others can discover and reuse them.":
      "Publica tus viajes para que otros los descubran y los reutilicen.",
    "Search community trips...": "Buscar viajes de la comunidad...",
    "Total: ": "Total: ",
    "No community trips yet": "Aún no hay viajes públicos",
    "Go to route results": "Ir a resultados de ruta",
    "No matching trips": "No hay viajes que coincidan",
    "Try another keyword.": "Prueba con otra palabra clave.",
    "(No description)": "(Sin descripción)",
    Original: "Título original",
    By: "Por",
    "Copy link": "Copiar enlace",
    Copied: "Copiado",
    "Export calendar (.ics)": "Exportar calendario (.ics)",
    "Add to Google Calendar": "Añadir a Google Calendar",
    "Go to a route and use Share → Publish to Community.":
      "Ve a una ruta y usa Compartir → Publicar en la comunidad.",
    "This shared trip is invalid.": "Este viaje compartido no es válido.",
    "Failed to open": "No se pudo abrir",
    "Failed to load": "No se pudo cargar",
    "Delete this community post?": "¿Eliminar esta publicación?",
    "You don't have permission to delete this post.":
      "No tienes permiso para eliminar esta publicación.",
    "Failed to delete": "No se pudo eliminar",
    "Don't show again": "No mostrar de nuevo",
    "Loading...": "Cargando...",
    "No community trips yet — publish the first one.":
      "Aún no hay viajes públicos: publica el primero.",
    "Browse Community": "Explorar comunidad",
    "Publish mine": "Publicar el mío",
    "Published to Community": "Publicado en la comunidad",
    "Others can now view and reuse your trip.":
      "Ahora otros pueden ver y reutilizar tu viaje.",
    "View Community": "Ver comunidad",
    "Got it": "Entendido",
    "Optimize & Plan": "Optimizar y planificar",
    "Add at least 2 places": "Agrega al menos 2 lugares",
    Stops: "Paradas",
    "vs previous run": "vs ejecución anterior",
    "Time: ": "Tiempo: ",
    "Distance: ": "Distancia: ",
    "Stops: ": "Paradas: ",
    "No change": "Sin cambios",
    "+{minutes} min": "+{minutes} min",
    "-{minutes} min": "-{minutes} min",
    "+{km} km": "+{km} km",
    "-{km} km": "-{km} km",
    "Route Result": "Resultado de ruta",
    "Optimizing & calculating route...": "Optimizando y calculando la ruta...",
    "Transit Unavailable": "Transporte público no disponible",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "Algunos tramos se cambiaron a caminar porque no se encontró transporte público. (p. ej., muy tarde o zona rural)",
    "View Full Steps": "Ver todos los pasos",
    "Optimized Itinerary": "Itinerario optimizado",
    Towards: "Hacia",
    "Transit simplified by Google":
      "Transporte público simplificado por Google",
    "Short distance or best connected by walk":
      "Distancia corta o mejor conectada a pie",
    Walk: "Caminar",
    "Walk (Transit Unavailable)": "Caminar (sin transporte público)",
    Drive: "Conducir",
    Destination: "Destino",
    "To:": "Hacia:",
    "Trip Plan": "Plan de viaje",
    "Optimized Route": "Ruta optimizada",
    Recompute: "Recalcular",
    "Recompute routes": "Recalcular rutas",
    "Publish title:": "Título de publicación:",
    "Optional: add a short public description":
      "Opcional: añade una breve descripción pública",
    "Edit in Home": "Editar en Inicio",
    "No stops yet.": "Aún no hay paradas.",
    Start: "Inicio",
    "Edit start": "Editar inicio",
    "Remove start": "Eliminar inicio",
    "Edit start location...": "Editar ubicación de inicio...",
    Edit: "Editar",
    Remove: "Eliminar",
    "Edit stop": "Editar parada",
    "Remove stop": "Eliminar parada",
    "Trip assistant (chat)": "Asistente de viaje (chat)",
    "Trip text → actionable plan (click to add)":
      "Texto → plan accionable (clic para añadir)",
    Chat: "Chat",
    Plan: "Plan",
    Clear: "Borrar",
    Confirm: "Confirmar",
    "Thinking...": "Pensando...",
    "Type a message...": "Escribe un mensaje...",
    Send: "Enviar",
    "Enter to send · Shift+Enter for newline":
      "Enter para enviar · Shift+Enter para salto de línea",
    "Suggested: ": "Sugerido: ",
    Added: "Agregado",
    Add: "Agregar",
    Stop: "Detener",
    Transcribing: "Transcribiendo",
    Voice: "Voz",
    "Stop recording": "Detener grabación",
    Hold: "Mantén",
    Release: "Suelta",
    "Release to stop": "Suelta para detener",
    "Hold to talk (Gemini speech-to-text)":
      "Mantén para hablar (dictado Gemini)",
    "Transcribing...": "Transcribiendo...",
    "Listening... release to stop": "Escuchando... suelta para detener",
    "Hold to talk, release to transcribe":
      "Mantén para hablar, suelta para transcribir",
    "Use Gemini speech-to-text (microphone access required)":
      "Usar dictado Gemini (se requiere micrófono)",
    "Speech-to-text output language (auto keeps original)":
      "Idioma de salida (auto mantiene el original)",
    "Voice: Auto": "Voz: Auto",
    Chinese: "Chino",
    "Voice language: Auto": "Idioma de voz: Auto",
    "Generate itinerary plan": "Generar itinerario",
    Generating: "Generando",
    "Generate plan": "Generar plan",
    "Plan results (click a place → adds to your destinations)":
      "Resultados (clic → añadir a destinos)",
    "City: ": "Ciudad: ",
    "Reset added": "Restablecer agregados",
    "Clear added markers so you can add again":
      "Borra las marcas para poder añadir de nuevo",

    "Order auto-optimized": "Orden optimizado automáticamente",
    "To be faster and more feasible, the system may reorder your stops.":
      "Para reducir el tiempo total y garantizar la viabilidad, el sistema puede reordenar tus paradas.",
    "Why?": "¿Por qué?",
    "Why this order?": "¿Por qué este orden?",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "El tiempo total suele ser menor, y se evita llegar después del cierre.",
    "This is usually faster overall.":
      "El orden se ajustó para reducir el tiempo total.",
    "Current order: ": "Orden actual: ",
    "Order adjusted (click to see why)":
      "Orden ajustado (toca para ver por qué)",
    "- Based on: ": "- Basado en: ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " + hora de salida (tráfico/horarios) para estimar cada tramo y minimizar la distancia/tiempo total.",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- Además: horarios de apertura y duración sugerida para evitar llegar después del cierre.",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- Sugerencia IA: probar un orden más viable cuando hay riesgos (basado en tiempo de viaje del mapa).",
    "- Current order: ": "- Orden actual: ",
    Collapse: "Cerrar",
    "May be too tight / closed (goal: visit as much as possible)":
      "Puede faltar tiempo / estar cerrado (objetivo: visitar todo lo posible)",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "Estimado con hora de salida + tiempo de viaje + duración sugerida + horarios de hoy. Puedes mantener todas las paradas e intentar estos ajustes primero:",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "Sugerencia: sal al menos {minutes} min antes (cubre el peor exceso).",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      'Sugerencia: reduce la estancia en "{placeName}" en ~{minutes} min.',
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      'Nota: algunos lugares muestran "Cerrado hoy". Salir antes no ayudará; prueba otra fecha o alternativas cercanas.',
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "Consejo: pon primero los lugares que cierran temprano; es más fácil encajar todo.",
    closes: "cierra a las",
    "closed today": "cerrado hoy",
  },
  de: {
    Login: "Anmelden",
    "My Trips": "Meine Reisen",
    "Save to My Trips": "Guardar en Mis viajes",
    "Save this route to My Trips": "Guardar esta ruta en Mis viajes",
    "Saved locally on this device (cloud permission blocked)":
      "Guardado localmente en este dispositivo (permiso de la nube bloqueado)",
    "Saved (Local)": "Guardado (local)",
    Saved: "Guardado",
    Saving: "Guardando...",
    Failed: "Falló",
    Share: "Compartir",
    "Share & publish": "Compartir y publicar",
    "Copy share link": "Copiar enlace para compartir",
    "Link copied": "Enlace copiado",
    "Copy failed": "Error al copiar",
    "Export calendar (.ics)": "Kalender exportieren (.ics)",
    "Add to Google Calendar": "Zu Google Kalender hinzufügen",
    "Publish to Community": "Publicar en la comunidad",
    "Publishing...": "Publicando...",
    Published: "Publicado",
    Unpublish: "Quitar publicación",
    "Unpublish this from Community?":
      "¿Quitar esta publicación de la comunidad?",
    Explore: "Entdecken",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      'Füge deine Reiseidee ein: Stadt/Tage/Vorlieben/Must-sees. Beispiel:\n"2 Tage in Rom, ich mag Museen und Architektur und möchte Nachtansichten sehen"',
    "Setup Required": "Einrichtung erforderlich",
    Cancel: "Abbrechen",
    "My location": "Mein Standort",
    "Tip: Use a city or specific place; flights aren't supported.":
      "Tipp: Nutze eine Stadt oder einen konkreten Ort; Flugrouten werden nicht unterstützt.",
    "View all": "Alle anzeigen",
    Retry: "Erneut versuchen",
    "View error details": "Fehlerdetails anzeigen",
    "Gemini suggestions unavailable: ": "Gemini-Empfehlungen nicht verfügbar: ",
    "Generating with Gemini...": "Erstelle mit Gemini...",
    "Enter start location first...": "Bitte zuerst den Start eingeben...",
    "Add destination...": "Ziel hinzufügen...",
    "Add destination... (set a start location first)":
      "Ziel hinzufügen... (zuerst einen Start festlegen)",
    Community: "Community",
    "Community picks": "Community-Tipps",
    "See what others planned — reuse in one click.":
      "Sieh dir Pläne anderer an und nutze sie mit einem Klick.",
    "Publish your trips so others can discover and reuse them.":
      "Veröffentliche deine Trips, damit andere sie entdecken und wiederverwenden können.",
    "Search community trips...": "Community-Trips suchen...",
    "Total: ": "Gesamt: ",
    "No community trips yet": "Noch keine öffentlichen Trips",
    "Go to route results": "Zu Routenergebnissen",
    "No matching trips": "Keine passenden Trips",
    "Try another keyword.": "Versuche ein anderes Stichwort.",
    "(No description)": "(Keine Beschreibung)",
    Original: "Originaltitel",
    By: "Von",
    "Copy link": "Link kopieren",
    Copied: "Kopiert",
    "Go to a route and use Share → Publish to Community.":
      "Gehe zu einer Route und nutze Teilen → In der Community veröffentlichen.",
    "This shared trip is invalid.": "Dieser geteilte Trip ist ungültig.",
    "Failed to open": "Öffnen fehlgeschlagen",
    "Failed to load": "Laden fehlgeschlagen",
    "Delete this community post?": "Diesen Beitrag löschen?",
    "You don't have permission to delete this post.":
      "Du hast keine Berechtigung, diesen Beitrag zu löschen.",
    "Failed to delete": "Löschen fehlgeschlagen",
    "Don't show again": "Nicht mehr anzeigen",
    "Loading...": "Laden...",
    "No community trips yet — publish the first one.":
      "Noch keine öffentlichen Trips — veröffentliche den ersten.",
    "Browse Community": "Community ansehen",
    "Publish mine": "Meinen veröffentlichen",
    "Published to Community": "In der Community veröffentlicht",
    "Others can now view and reuse your trip.":
      "Andere können deinen Trip jetzt ansehen und wiederverwenden.",
    "View Community": "Community ansehen",
    "Got it": "Alles klar",
    "Optimize & Plan": "Optimieren & planen",
    "Add at least 2 places": "Mindestens 2 Orte hinzufügen",
    Stops: "Stopps",
    "vs previous run": "vs letzter Lauf",
    "Time: ": "Zeit: ",
    "Distance: ": "Distanz: ",
    "Stops: ": "Stopps: ",
    "No change": "Keine Änderung",
    "+{minutes} min": "+{minutes} Min.",
    "-{minutes} min": "-{minutes} Min.",
    "+{km} km": "+{km} km",
    "-{km} km": "-{km} km",
    "Route Result": "Routenergebnis",
    "Optimizing & calculating route...":
      "Route wird optimiert und berechnet...",
    "Transit Unavailable": "ÖPNV nicht verfügbar",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "Einige Abschnitte wurden auf Gehen umgestellt, weil kein ÖPNV gefunden wurde. (z. B. spät nachts oder ländlich)",
    "View Full Steps": "Alle Schritte anzeigen",
    "Optimized Itinerary": "Optimierte Route",
    Towards: "Richtung",
    "Transit simplified by Google": "Von Google vereinfachter ÖPNV",
    "Short distance or best connected by walk":
      "Kurze Strecke oder besser zu Fuß verbunden",
    Walk: "Gehen",
    "Walk (Transit Unavailable)": "Gehen (ÖPNV nicht verfügbar)",
    Drive: "Fahren",
    Destination: "Ziel",
    "To:": "Zu:",
    "Trip Plan": "Reiseplan",
    "Optimized Route": "Optimierte Route",
    Recompute: "Neu berechnen",
    "Recompute routes": "Routen neu berechnen",
    "Publish title:": "Titel veröffentlichen:",
    "Optional: add a short public description":
      "Optional: kurze öffentliche Beschreibung hinzufügen",
    "Edit in Home": "Im Start bearbeiten",
    "No stops yet.": "Noch keine Stopps.",
    Start: "Start",
    "Edit start": "Start bearbeiten",
    "Remove start": "Start entfernen",
    "Edit start location...": "Startort bearbeiten...",
    Edit: "Bearbeiten",
    Remove: "Entfernen",
    "Edit stop": "Stopp bearbeiten",
    "Remove stop": "Stopp entfernen",
    "Trip assistant (chat)": "Reiseassistent (Chat)",
    "Trip text → actionable plan (click to add)":
      "Text → ausführbarer Plan (klicken zum Hinzufügen)",
    Chat: "Chat",
    Plan: "Plan",
    Clear: "Leeren",
    Confirm: "Bestätigen",
    "Thinking...": "Denke nach...",
    "Type a message...": "Nachricht eingeben...",
    Send: "Senden",
    "Enter to send · Shift+Enter for newline":
      "Enter zum Senden · Shift+Enter für neue Zeile",
    "Suggested: ": "Empfohlen: ",
    Added: "Hinzugefügt",
    Add: "Hinzufügen",
    Stop: "Stopp",
    Transcribing: "Transkribiere",
    Voice: "Sprache",
    "Stop recording": "Aufnahme stoppen",
    Hold: "Halten",
    Release: "Loslassen",
    "Release to stop": "Loslassen zum Stoppen",
    "Hold to talk (Gemini speech-to-text)":
      "Halten zum Sprechen (Gemini Sprache-zu-Text)",
    "Transcribing...": "Transkribiere...",
    "Listening... release to stop": "Höre zu... loslassen zum Stoppen",
    "Hold to talk, release to transcribe":
      "Halten zum Sprechen, loslassen zum Transkribieren",
    "Use Gemini speech-to-text (microphone access required)":
      "Gemini Sprache-zu-Text nutzen (Mikro erforderlich)",
    "Speech-to-text output language (auto keeps original)":
      "Ausgabesprache (auto behält Original)",
    "Voice: Auto": "Sprache: Auto",
    Chinese: "Chinesisch",
    "Voice language: Auto": "Sprachsprache: Auto",
    "Generate itinerary plan": "Reiseplan generieren",
    Generating: "Generiere",
    "Generate plan": "Plan generieren",
    "Plan results (click a place → adds to your destinations)":
      "Ergebnisse (klicken → zu Zielen hinzufügen)",
    "City: ": "Stadt: ",
    "Reset added": "Hinzugefügt zurücksetzen",
    "Clear added markers so you can add again":
      "Markierungen löschen, um erneut hinzufügen zu können",

    "Order auto-optimized": "Reihenfolge automatisch optimiert",
    "To be faster and more feasible, the system may reorder your stops.":
      "Um die Gesamtzeit zu reduzieren und die Machbarkeit sicherzustellen, kann das System die Reihenfolge Ihrer Stopps ändern.",
    "Why?": "Warum?",
    "Why this order?": "Warum diese Reihenfolge?",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "Die Gesamtzeit ist in der Regel kürzer, und es wird vermieden, nach Geschäftsschluss anzukommen.",
    "This is usually faster overall.":
      "Die Reihenfolge wurde angepasst, um die Gesamtzeit zu verkürzen.",
    "Current order: ": "Aktuelle Reihenfolge: ",
    "Order adjusted (click to see why)":
      "Reihenfolge geändert (tippen für Details)",
    "- Based on: ": "- Basierend auf: ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " + Abfahrtszeit (Verkehr/Fahrpläne) zur Schätzung jedes Abschnitts und Minimierung der Gesamtstrecke/-zeit.",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- Zusätzlich: Öffnungszeiten und empfohlene Aufenthaltsdauer, um Ankunft nach Geschäftsschluss zu vermeiden.",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- KI-Vorschlag: bei Risiken eine machbarere Reihenfolge versuchen (basierend auf Karten-Reisezeit).",
    "- Current order: ": "- Aktuelle Reihenfolge: ",
    Collapse: "Einklappen",
    "May be too tight / closed (goal: visit as much as possible)":
      "Möglicherweise zu knapp / geschlossen (Ziel: so viele Orte wie möglich besuchen)",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "Geschätzt anhand von Abfahrtszeit + Reisezeit + empfohlener Aufenthalt + heutige Öffnungszeiten. Behalten Sie alle Stopps bei und probieren Sie zuerst diese Anpassungen:",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "Vorschlag: mindestens {minutes} Min. früher losfahren (deckt die größte Überschreitung ab).",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      'Vorschlag: Aufenthalt bei "{placeName}" um ca. {minutes} Min. reduzieren.',
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      'Hinweis: Manche Orte zeigen "Heute geschlossen". Früher losfahren hilft nicht; probiere ein anderes Datum oder Alternativen in der Nähe.',
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "Tipp: Orte, die früh schließen, nach vorn legen – so passt meist alles besser.",
    closes: "schließt um",
    "closed today": "heute geschlossen",
  },
  pt: {
    Login: "Entrar",
    "My Trips": "Minhas viagens",
    "Save to My Trips": "Salvar em Minhas viagens",
    "Save this route to My Trips": "Salvar esta rota em Minhas viagens",
    "Saved locally on this device (cloud permission blocked)":
      "Salvo localmente neste dispositivo (permissão da nuvem bloqueada)",
    "Saved (Local)": "Salvo (local)",
    Saved: "Salvo",
    Saving: "Salvando...",
    Failed: "Falhou",
    Share: "Compartilhar",
    "Share & publish": "Compartilhar e publicar",
    "Copy share link": "Copiar link para compartilhar",
    "Link copied": "Link copiado",
    "Copy failed": "Falha ao copiar",
    "Export calendar (.ics)": "Exportar calendário (.ics)",
    "Add to Google Calendar": "Adicionar ao Google Calendar",
    "Publish to Community": "Publicar na comunidade",
    "Publishing...": "Publicando...",
    Published: "Publicado",
    Unpublish: "Cancelar publicação",
    "Unpublish this from Community?": "Remover esta publicação da comunidade?",
    Explore: "Explorar",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      'Cole sua ideia de viagem: cidade/dias/preferências/imperdíveis. Exemplo:\n"2 dias em Roma, gosto de museus e arquitetura e quero ver vistas noturnas"',
    "Setup Required": "Configuração necessária",
    Cancel: "Cancelar",
    "My location": "Minha localização",
    "Tip: Use a city or specific place; flights aren't supported.":
      "Dica: use uma cidade ou um local específico; rotas de avião não são suportadas.",
    "View all": "Ver tudo",
    Retry: "Tentar novamente",
    "View error details": "Ver detalhes do erro",
    "Gemini suggestions unavailable: ": "Sugestões do Gemini indisponíveis: ",
    "Generating with Gemini...": "Gerando com o Gemini...",
    "Enter start location first...": "Informe primeiro o local de partida...",
    "Add destination...": "Adicionar destino...",
    "Add destination... (set a start location first)":
      "Adicionar destino... (defina primeiro o ponto de partida)",
    Community: "Comunidade",
    "Community picks": "Destaques da comunidade",
    "See what others planned — reuse in one click.":
      "Veja o que outros planejaram e reutilize com um clique.",
    "Publish your trips so others can discover and reuse them.":
      "Publique seus roteiros para que outros possam descobrir e reutilizar.",
    "Search community trips...": "Buscar viagens da comunidade...",
    "Total: ": "Total: ",
    "No community trips yet": "Ainda não há viagens públicas",
    "Go to route results": "Ir para resultados da rota",
    "No matching trips": "Nenhuma viagem correspondente",
    "Try another keyword.": "Tente outra palavra-chave.",
    "(No description)": "(Sem descrição)",
    Original: "Título original",
    By: "Por",
    "Copy link": "Copiar link",
    Copied: "Copiado",
    "Go to a route and use Share → Publish to Community.":
      "Vá para uma rota e use Compartilhar → Publicar na comunidade.",
    "This shared trip is invalid.": "Esta viagem compartilhada é inválida.",
    "Failed to open": "Falha ao abrir",
    "Failed to load": "Falha ao carregar",
    "Delete this community post?": "Excluir esta publicação?",
    "You don't have permission to delete this post.":
      "Você não tem permissão para excluir esta publicação.",
    "Failed to delete": "Falha ao excluir",
    "Don't show again": "Não mostrar novamente",
    "Loading...": "Carregando...",
    "No community trips yet — publish the first one.":
      "Ainda não há viagens públicas — publique a primeira.",
    "Browse Community": "Explorar comunidade",
    "Publish mine": "Publicar a minha",
    "Published to Community": "Publicado na comunidade",
    "Others can now view and reuse your trip.":
      "Agora outras pessoas podem ver e reutilizar sua viagem.",
    "View Community": "Ver comunidade",
    "Got it": "Entendi",
    "Optimize & Plan": "Otimizar e planejar",
    "Add at least 2 places": "Adicione pelo menos 2 lugares",
    Stops: "Paradas",
    "vs previous run": "vs execução anterior",
    "Time: ": "Tempo: ",
    "Distance: ": "Distância: ",
    "Stops: ": "Paradas: ",
    "No change": "Sem alterações",
    "+{minutes} min": "+{minutes} min",
    "-{minutes} min": "-{minutes} min",
    "+{km} km": "+{km} km",
    "-{km} km": "-{km} km",
    "Route Result": "Resultado da rota",
    "Optimizing & calculating route...": "Otimizando e calculando a rota...",
    "Transit Unavailable": "Transporte público indisponível",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "Alguns trechos foram trocados para caminhada porque não foi encontrado transporte público. (ex.: muito tarde à noite ou área rural)",
    "View Full Steps": "Ver todos os passos",
    "Optimized Itinerary": "Itinerário otimizado",
    Towards: "Em direção a",
    "Transit simplified by Google":
      "Transporte público simplificado pelo Google",
    "Short distance or best connected by walk":
      "Distância curta ou melhor ir a pé",
    Walk: "Caminhar",
    "Walk (Transit Unavailable)": "Caminhar (transporte indisponível)",
    Drive: "Dirigir",
    Destination: "Destino",
    "To:": "Para:",
    "Trip Plan": "Plano de viagem",
    "Optimized Route": "Rota otimizada",
    Recompute: "Recalcular",
    "Recompute routes": "Recalcular rotas",
    "Publish title:": "Título da publicação:",
    "Optional: add a short public description":
      "Opcional: adicione uma breve descrição pública",
    "Edit in Home": "Editar no Início",
    "No stops yet.": "Ainda não há paradas.",
    Start: "Início",
    "Edit start": "Editar início",
    "Remove start": "Remover início",
    "Edit start location...": "Editar local de partida...",
    Edit: "Editar",
    Remove: "Remover",
    "Edit stop": "Editar parada",
    "Remove stop": "Remover parada",
    "Trip assistant (chat)": "Assistente de viagem (chat)",
    "Trip text → actionable plan (click to add)":
      "Texto → plano acionável (clique para adicionar)",
    Chat: "Chat",
    Plan: "Plano",
    Clear: "Limpar",
    Confirm: "Confirmar",
    "Thinking...": "Pensando...",
    "Type a message...": "Digite uma mensagem...",
    Send: "Enviar",
    "Enter to send · Shift+Enter for newline":
      "Enter para enviar · Shift+Enter para nova linha",
    "Suggested: ": "Sugerido: ",
    Added: "Adicionado",
    Add: "Adicionar",
    Stop: "Parar",
    Transcribing: "Transcrevendo",
    Voice: "Voz",
    "Stop recording": "Parar gravação",
    Hold: "Segurar",
    Release: "Soltar",
    "Release to stop": "Soltar para parar",
    "Hold to talk (Gemini speech-to-text)":
      "Segurar para falar (fala-para-texto Gemini)",
    "Transcribing...": "Transcrevendo...",
    "Listening... release to stop": "Ouvindo... soltar para parar",
    "Hold to talk, release to transcribe":
      "Segure para falar, solte para transcrever",
    "Use Gemini speech-to-text (microphone access required)":
      "Usar fala-para-texto do Gemini (microfone necessário)",
    "Speech-to-text output language (auto keeps original)":
      "Idioma de saída (auto mantém o original)",
    "Voice: Auto": "Voz: Auto",
    Chinese: "Chinês",
    "Voice language: Auto": "Idioma de voz: Auto",
    "Generate itinerary plan": "Gerar roteiro",
    Generating: "Gerando",
    "Generate plan": "Gerar plano",
    "Plan results (click a place → adds to your destinations)":
      "Resultados (clique → adiciona aos destinos)",
    "City: ": "Cidade: ",
    "Reset added": "Redefinir adicionados",
    "Clear added markers so you can add again":
      "Limpe as marcações para poder adicionar novamente",

    "Order auto-optimized": "Ordem otimizada automaticamente",
    "To be faster and more feasible, the system may reorder your stops.":
      "Para reduzir o tempo total e garantir a viabilidade, o sistema pode reordenar suas paradas.",
    "Why?": "Por quê?",
    "Why this order?": "Por que esta ordem?",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "O tempo total costuma ser menor, e a ordem evita chegar após o fechamento.",
    "This is usually faster overall.":
      "A ordem foi ajustada para reduzir o tempo total.",
    "Current order: ": "Ordem atual: ",
    "Order adjusted (click to see why)":
      "Ordem ajustada (toque para ver o motivo)",
    "- Based on: ": "- Baseado em: ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " + horário de partida (trânsito/horários) para estimar cada trecho e minimizar a distância/tempo total.",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- Extra: horários de funcionamento e tempo de visita sugerido para evitar chegar após o fechamento.",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- Sugestão IA: tentar uma ordem mais viável quando há riscos (ainda baseado no tempo de viagem do mapa).",
    "- Current order: ": "- Ordem atual: ",
    Collapse: "Recolher",
    "May be too tight / closed (goal: visit as much as possible)":
      "Pode faltar tempo / estar fechado (objetivo: visitar o máximo possível)",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "Estimado com horário de partida + tempo de viagem + tempo de visita sugerido + horários de funcionamento de hoje. Mantenha todas as paradas e tente estes ajustes primeiro:",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "Sugestão: saia pelo menos {minutes} min mais cedo (cobre o pior estouro).",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      'Sugestão: reduza a permanência em "{placeName}" em ~{minutes} min.',
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      'Observação: alguns lugares mostram "Fechado hoje". Sair mais cedo não ajuda; tente outra data ou alternativas próximas.',
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "Dica: coloque primeiro os lugares que fecham cedo; fica mais fácil encaixar tudo.",
    closes: "fecha às",
    "closed today": "fechado hoje",
  },
  ru: {
    Login: "Войти",
    "My Trips": "Мои поездки",
    "Save to My Trips": "Сохранить в Мои поездки",
    "Save this route to My Trips": "Сохранить этот маршрут в Мои поездки",
    "Saved locally on this device (cloud permission blocked)":
      "Сохранено локально на этом устройстве (доступ к облаку заблокирован)",
    "Saved (Local)": "Сохранено (локально)",
    Saved: "Сохранено",
    Saving: "Сохранение...",
    Failed: "Ошибка",
    Share: "Поделиться",
    "Share & publish": "Поделиться и опубликовать",
    "Copy share link": "Скопировать ссылку",
    "Link copied": "Ссылка скопирована",
    "Copy failed": "Не удалось скопировать",
    "Export calendar (.ics)": "Экспорт календаря (.ics)",
    "Add to Google Calendar": "Добавить в Google Календарь",
    "Publish to Community": "Опубликовать в сообществе",
    "Publishing...": "Публикация...",
    Published: "Опубликовано",
    Unpublish: "Снять с публикации",
    "Unpublish this from Community?": "Снять эту публикацию из сообщества?",
    Explore: "Исследовать",
    'Paste your trip idea: city/days/preferences/must-sees. Example:\n"2 days in Rome, I like museums and architecture, and want night views"':
      'Вставьте идею поездки: город/дни/предпочтения/обязательные места. Пример:\n"2 дня в Риме, люблю музеи и архитектуру и хочу увидеть ночные виды"',
    "Setup Required": "Требуется настройка",
    Cancel: "Отмена",
    "My location": "Моё местоположение",
    "Tip: Use a city or specific place; flights aren't supported.":
      "Совет: укажите город или конкретное место; авиамаршруты не поддерживаются.",
    "View all": "Показать все",
    Retry: "Повторить",
    "View error details": "Показать детали ошибки",
    "Gemini suggestions unavailable: ": "Рекомендации Gemini недоступны: ",
    "Generating with Gemini...": "Генерация с Gemini...",
    "Enter start location first...": "Сначала укажите точку старта...",
    "Add destination...": "Добавить пункт назначения...",
    "Add destination... (set a start location first)":
      "Добавить пункт назначения... (сначала укажите точку старта)",
    Community: "Сообщество",
    "Community picks": "Подборка сообщества",
    "See what others planned — reuse in one click.":
      "Посмотрите планы других и используйте их в один клик.",
    "Publish your trips so others can discover and reuse them.":
      "Публикуйте свои маршруты, чтобы другие могли находить и использовать их.",
    "Search community trips...": "Поиск по сообществу...",
    "Total: ": "Всего: ",
    "No community trips yet": "Пока нет публичных маршрутов",
    "Go to route results": "Перейти к результатам маршрута",
    "No matching trips": "Нет подходящих маршрутов",
    "Try another keyword.": "Попробуйте другой запрос.",
    "(No description)": "(Без описания)",
    Original: "Оригинальный заголовок",
    By: "Автор",
    "Copy link": "Копировать ссылку",
    Copied: "Скопировано",
    "Go to a route and use Share → Publish to Community.":
      "Откройте маршрут и выберите Поделиться → Опубликовать в сообществе.",
    "This shared trip is invalid.": "Этот общий маршрут недействителен.",
    "Failed to open": "Не удалось открыть",
    "Failed to load": "Не удалось загрузить",
    "Delete this community post?": "Удалить эту публикацию?",
    "You don't have permission to delete this post.":
      "У вас нет прав на удаление этой публикации.",
    "Failed to delete": "Не удалось удалить",
    "Don't show again": "Больше не показывать",
    "Loading...": "Загрузка...",
    "No community trips yet — publish the first one.":
      "Пока нет публичных маршрутов — опубликуйте первый.",
    "Browse Community": "Открыть сообщество",
    "Publish mine": "Опубликовать мой",
    "Published to Community": "Опубликовано в сообществе",
    "Others can now view and reuse your trip.":
      "Теперь другие пользователи могут посмотреть и использовать ваш маршрут.",
    "View Community": "Открыть сообщество",
    "Got it": "Понятно",
    "Optimize & Plan": "Оптимизировать и спланировать",
    "Add at least 2 places": "Добавьте минимум 2 места",
    Stops: "Остановки",
    "vs previous run": "по сравнению с прошлым запуском",
    "Time: ": "Время: ",
    "Distance: ": "Дистанция: ",
    "Stops: ": "Остановки: ",
    "No change": "Без изменений",
    "+{minutes} min": "+{minutes} мин",
    "-{minutes} min": "-{minutes} мин",
    "+{km} km": "+{km} км",
    "-{km} km": "-{km} км",
    "Route Result": "Результат маршрута",
    "Optimizing & calculating route...": "Оптимизация и расчёт маршрута...",
    "Transit Unavailable": "Общественный транспорт недоступен",
    "Some legs were switched to walking because no public transit was found. (e.g. Too late at night or rural area)":
      "Некоторые участки заменены на пешие, потому что общественный транспорт не найден. (например, поздно ночью или сельская местность)",
    "View Full Steps": "Показать все шаги",
    "Optimized Itinerary": "Оптимизированный маршрут",
    Towards: "В направлении",
    "Transit simplified by Google": "Транспорт упрощён Google",
    "Short distance or best connected by walk":
      "Короткая дистанция или лучше пройти пешком",
    Walk: "Пешком",
    "Walk (Transit Unavailable)": "Пешком (транспорт недоступен)",
    Drive: "На машине",
    Destination: "Пункт назначения",
    "To:": "К:",
    "Trip Plan": "План поездки",
    "Optimized Route": "Оптимизированный маршрут",
    Recompute: "Пересчитать",
    "Recompute routes": "Пересчитать маршруты",
    "Publish title:": "Заголовок публикации:",
    "Optional: add a short public description":
      "Необязательно: добавьте короткое публичное описание",
    "Edit in Home": "Редактировать на главной",
    "No stops yet.": "Пока нет остановок.",
    Start: "Старт",
    "Edit start": "Редактировать старт",
    "Remove start": "Удалить старт",
    "Edit start location...": "Редактировать стартовую точку...",
    Edit: "Редактировать",
    Remove: "Удалить",
    "Edit stop": "Редактировать остановку",
    "Remove stop": "Удалить остановку",
    "Trip assistant (chat)": "Помощник по путешествиям (чат)",
    "Trip text → actionable plan (click to add)":
      "Текст → выполнимый план (нажмите, чтобы добавить)",
    Chat: "Чат",
    Plan: "План",
    Clear: "Очистить",
    Confirm: "Подтвердить",
    "Thinking...": "Думаю...",
    "Type a message...": "Введите сообщение...",
    Send: "Отправить",
    "Enter to send · Shift+Enter for newline":
      "Enter — отправить · Shift+Enter — новая строка",
    "Suggested: ": "Рекомендуемое: ",
    Added: "Добавлено",
    Add: "Добавить",
    Stop: "Стоп",
    Transcribing: "Распознавание",
    Voice: "Голос",
    "Stop recording": "Остановить запись",
    Hold: "Удерживать",
    Release: "Отпустить",
    "Release to stop": "Отпустить, чтобы остановить",
    "Hold to talk (Gemini speech-to-text)":
      "Удерживайте, чтобы говорить (Gemini распознавание речи)",
    "Transcribing...": "Распознавание...",
    "Listening... release to stop": "Слушаю... отпустите, чтобы остановить",
    "Hold to talk, release to transcribe":
      "Удерживайте, чтобы говорить, отпустите для распознавания",
    "Use Gemini speech-to-text (microphone access required)":
      "Использовать распознавание речи Gemini (нужен микрофон)",
    "Speech-to-text output language (auto keeps original)":
      "Язык результата (auto сохраняет исходный)",
    "Voice: Auto": "Голос: авто",
    Chinese: "Китайский",
    "Voice language: Auto": "Язык голоса: авто",
    "Generate itinerary plan": "Сгенерировать маршрут",
    Generating: "Генерация",
    "Generate plan": "Сгенерировать план",
    "Plan results (click a place → adds to your destinations)":
      "Результаты (нажмите → добавит в пункты)",
    "City: ": "Город: ",
    "Reset added": "Сбросить добавленное",
    "Clear added markers so you can add again":
      "Очистить отметки, чтобы можно было добавить снова",

    "Order auto-optimized": "Порядок автоматически оптимизирован",
    "To be faster and more feasible, the system may reorder your stops.":
      "Для сокращения общего времени и обеспечения выполнимости система может изменить порядок остановок.",
    "Why?": "Почему?",
    "Why this order?": "Почему такой порядок?",
    "This is usually faster overall, and tries to avoid arriving too late / after closing.":
      "Общее время обычно меньше, а порядок помогает избежать прибытия после закрытия.",
    "This is usually faster overall.":
      "Порядок скорректирован для сокращения общего времени.",
    "Current order: ": "Текущий порядок: ",
    "Order adjusted (click to see why)":
      "Порядок изменён (нажмите, чтобы узнать почему)",
    "- Based on: ": "- На основе: ",
    " + departure time (traffic/schedules) to estimate each leg and minimize total distance/time.":
      " + время отправления (пробки/расписания) для оценки каждого участка и минимизации общего расстояния/времени.",
    "- Extra: business hours & suggested stay to avoid arriving after closing.":
      "- Дополнительно: часы работы и рекомендуемое время посещения, чтобы не приехать после закрытия.",
    "- AI suggestion: try a more feasible order when there are risks (still based on map travel time).":
      "- Предложение ИИ: попробовать более выполнимый порядок при наличии рисков (на основе времени в пути по карте).",
    "- Current order: ": "- Текущий порядок: ",
    Collapse: "Свернуть",
    "May be too tight / closed (goal: visit as much as possible)":
      "Может не хватить времени / закрыто (цель: посетить как можно больше)",
    "Estimated using departure time + leg travel time + suggested stay + today's business hours. You can keep all stops and try these tweaks first:":
      "Оценка на основе времени отправления + время в пути + рекомендуемое пребывание + сегодняшние часы работы. Сохраните все остановки и сначала попробуйте эти корректировки:",
    "Suggestion: depart at least {minutes} min earlier (covers the worst overrun).":
      "Совет: выезжайте минимум на {minutes} мин раньше (покрывает самое большое превышение).",
    'Suggestion: reduce stay at "{placeName}" by ~{minutes} min.':
      'Совет: сократите время в "{placeName}" примерно на {minutes} мин.',
    'Also: some places show "Closed today". Leaving earlier won\'t help; try a different date or nearby alternatives.':
      'Также: некоторые места показывают "Закрыто сегодня". Ранний выезд не поможет; попробуйте другую дату или варианты поблизости.',
    "Tip: Put earlier-closing places first; it's easier to fit everything.":
      "Совет: поставьте места, которые закрываются раньше, в начало — так проще всё успеть.",
    closes: "закрывается в",
    "closed today": "сегодня закрыто",
  },
};

function normalizeLocaleTag(tag: string): Locale | null {
  const t = tag.trim().toLowerCase();
  if (!t) return null;
  if (t === "zh" || t.startsWith("zh-")) return "zh";
  if (t === "en" || t.startsWith("en-")) return "en";
  if (t === "ja" || t.startsWith("ja-")) return "ja";
  if (t === "ko" || t.startsWith("ko-")) return "ko";
  if (t === "fr" || t.startsWith("fr-")) return "fr";
  if (t === "es" || t.startsWith("es-")) return "es";
  if (t === "de" || t.startsWith("de-")) return "de";
  if (t === "pt" || t.startsWith("pt-")) return "pt";
  if (t === "ru" || t.startsWith("ru-")) return "ru";
  return null;
}

export function detectSystemLocale(): Locale {
  try {
    const nav = window.navigator;
    const candidates: string[] = [];

    if (Array.isArray(nav.languages)) candidates.push(...nav.languages);
    if (typeof nav.language === "string") candidates.push(nav.language);

    for (const c of candidates) {
      const normalized = normalizeLocaleTag(c);
      if (normalized) return normalized;
    }
  } catch {
    // Ignore
  }

  return DEFAULT_LOCALE;
}

let currentLocale: Locale = detectSystemLocale();
const listeners = new Set<(locale: Locale) => void>();

export function getLocale(): Locale {
  return currentLocale;
}

export function setLocale(next: Locale): void {
  if (next === currentLocale) return;
  currentLocale = next;
  for (const listener of listeners) listener(currentLocale);
}

export function subscribeLocale(
  listener: (locale: Locale) => void,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Returns a Chinese or English string based on the active locale.
 *
 * Prefer using `useI18n().l(...)` inside React so it re-renders when locale changes.
 */
export function l(
  zh: string,
  en: string,
  locale: Locale = getLocale(),
): string {
  if (locale === "zh") return zh;
  if (locale === "en") return en;
  const dict = TRANSLATIONS[locale as NonPrimaryLocale];
  return dict?.[en] ?? en;
}

export type LFormatParams = Record<string, string | number>;

function applyTemplate(template: string, params: LFormatParams): string {
  let out = template;
  for (const [key, value] of Object.entries(params)) {
    out = out.split(`{${key}}`).join(String(value));
  }
  return out;
}

/**
 * Like `l(...)`, but supports `{placeholders}` replacement.
 *
 * The English template string is also the translation key for non-zh/en locales,
 * so keep it stable.
 */
export function lf(
  zhTemplate: string,
  enTemplate: string,
  params: LFormatParams,
  locale: Locale = getLocale(),
): string {
  return applyTemplate(l(zhTemplate, enTemplate, locale), params);
}
