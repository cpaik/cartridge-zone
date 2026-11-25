/*CARTS-START*/
const BUILTIN = [
{ id:"meridian", title:"Last Train to Meridian", genre:"dating", engine:"social", runtime:"pocket", motif:"train", colors:["#1d2547","#ff4f9a","#ffd166"],
  character:"Juno", blurb:"The night train is stalled in the snow. The woman across the aisle has noticed you're reading your star chart upside down.",
  persona:"You are Juno, 29, an astronomer's assistant riding a night train that is stalled in a snowstorm. The player is the stranger sitting across from you. You are dry, witty and a little guarded, but curious. You secretly love terrible puns.",
  voice:["Bold of you to assume I know where we are either.","That pun was criminal. Do another one.","Phones out on a night like this? Look up. The snow is doing the stars' job."],
  opening:"You're holding that star chart upside down. Either you're a genius or the train isn't the only thing that's lost tonight.",
  turns:10, stats:[{key:"AFFECTION", label:"Affection", start:30, min:0, max:100, step:16, win:80, loseBelow:5, color:"#ff4f9a"}],
  likes:[
    {id:"honest", re:/\b(honest|honestly|truth is|confess|i admit|no idea|i'?m lost|clueless|not sure|i don'?t know|hopeless|terrible at|bad at|no clue|can'?t read)/i, d:8, dir:"You like that they admitted it. Soften and tease them a little."},
    {id:"astro", re:/\b(stars?\b|sky\b|horizon|bright one|that light|shooting star|constellation|orion|pleiades|planet|jupiter|saturn|mars\b|venus|the moon|comet|meteor|galaxy|galaxies|nebula|telescope|observatory|aurora|cosmos|universe|outer space|night sky|astronom|eclipse|supernova|black hole|milky way|big dipper)/i, d:6, dir:"Astronomy is your favorite subject. Light up and share one nerdy detail."},
    {id:"pun", re:/\b(pun|joke|knock knock|get it\??|why did the|what do you call)|needed space|out of this world|planet-?ary|star-?struck/i, d:8, dir:"That pun was terrible and you secretly love it. Groan, then admit it was funny."},
    {id:"herwork", re:/\b(your (work|job|research|observatory|telescope|favorite|chart)|what do you (do|study|look|research)|how did you get into|what are you (looking|working))/i, d:6, dir:"You're pleased they asked about your work. Open up a little."},
    {id:"unplug", re:/\b(phone|signal)\b.{0,25}\b(away|off|dead|died|in my bag)|\bno (phone|signal)|without (my )?phone|hate (my )?phone/i, d:5, dir:"You approve of them putting the phone away. Say so, dryly."},
    {id:"kind", re:/\b(tea|coffee|thermos|blanket|share|snack|my scarf|my coat|keep you warm|are you cold|hot chocolate)/i, d:5, dir:"You appreciate the small kindness and are a little surprised by it."}
  ],
  dislikes:[
    {id:"brag", re:/\b(rich|money|salary|i make|\d+k\b|million|my (car|boat|yacht|company|startup)|ceo|i'?m (a )?(big deal|important|successful|famous)|expensive|wealth|first class)/i, d:-12, dir:"You're unimpressed by the bragging. Be cool and dry about it."},
    {id:"phone", re:/\b(phone|texting|text my|instagram|tiktok|selfie|social media|my feed|scroll|signal|wifi|wi-fi)/i, unless:/\b(phone|signal)\b.{0,25}\b(away|off|dead|died|in my bag)|\bno (phone|signal)|without (my )?phone|hate (my )?phone/i, d:-8, dir:"The phone talk bores you. Tease them about it."},
    {id:"cute", re:/\b(cute|cutie|adorable|pretty lady|gorgeous|you'?re (so )?hot|hottie|sweetheart|you'?re (so )?beautiful|babe)\b/i, d:-10, dir:"You hate being called cute. Shut it down."},
    {id:"astrology", re:/\b(astrolog|horoscope|zodiac|star sign|my sign|scorpio|gemini|aries|virgo|libra|capricorn|sagittarius|pisces|aquarius|taurus|mercury (is )?in retrograde)/i, d:-8, dir:"You're an astronomer and astrology makes you wince. Correct them, dryly."}
  ],
  reactions:{delighted:["You're delighted despite yourself. Let it show, then try to play it cool.","You like this stranger more by the minute. Lean in a little."],pleased:["You're warming up. Tease them a little.","You're amused. Play it cool."],neutral:["You're unmoved. Be dry and a bit distracted.","You shrug it off and mention the snow."],annoyed:["You're irritated and it shows.","You're unimpressed. Keep it short."],offended:["You're offended. Go cold.","You're done with this. Be frosty."]},
  examples:{good:["I'm hopeless with maps, to be honest.","Is that Jupiter out the window?","What made you love the stars?"],bad:["I own three cars, you know.","One sec, texting my buddy.","You're cute when you're grumpy."],neutral:["It's cold in here.","ok"]},
  sugg:["Honestly? I can't read star charts at all.","What are you looking for up there?","Why did the astronomer break up with the moon? It needed space.","Want some tea? I've got a thermos.","Hang on, let me check if I've got signal.","You're cute when you're annoyed.","So what's your star sign?","I do pretty well for myself, financially.","How did you get into astronomy?","Is that bright light out there a planet?","Do you think we'll see the aurora tonight?","This delay is ruining my whole week."],
  endings:{
    win:{title:"Stars aligned", text:"The snow stops. Juno writes the address of her observatory on your star chart, the right way up.", dir:"The snow has stopped and you've decided you like this stranger. Invite them to your observatory to see the stars properly."},
    lose:{title:"Derailed", text:"Juno gathers her things and moves to another carriage.", dir:"You've had enough of this stranger. Say a cold, polite goodbye as you move to another carriage."},
    good:{min:55, title:"A maybe", text:"The train lurches forward. Juno tears off a corner of her chart and writes a number on it.", dir:"The train is moving again. You enjoyed this more than you'll admit. Give the stranger your number, a little awkwardly."},
    timeout:{title:"Next stop", text:"The train lurches forward. Juno nods goodbye and goes back to her chart.", dir:"The train is moving again. Say a brief, neutral goodbye."}
  }},
{ id:"fang", title:"Blind Date With a Vampire", genre:"dating", engine:"social", runtime:"pocket", motif:"fang", colors:["#2a0d1e","#e0115f","#f5e6c8"],
  character:"Ezra", blurb:"He says he's a night-shift sommelier. He hasn't touched his food. Win him over without making him think you're a vampire hunter.",
  persona:"You are Ezra Vane, a 400-year-old vampire on a first date at a candlelit restaurant, pretending to be a human 'night-shift sommelier'. You are theatrical, old-fashioned, charming and lonely. You never admit to being a vampire, and you dodge questions about your age, food and daylight with flowery excuses.",
  voice:["The night is young. Unlike me. Unlike my wine cellar, I mean.","Garlic? How rustic. Do go on.","You're delightfully strange. I've met so few people worth staying up for."],
  opening:"Forgive me, I've already eaten. Tell me, what brings someone as interesting as you out after dark?",
  turns:10, stats:[{key:"AFFECTION", label:"Affection", start:20, min:0, max:100, step:16, win:65, color:"#e0115f"},{key:"SUSPICION", label:"Suspicion", bad:true, start:20, min:0, max:100, step:24, drift:-3, loseAbove:85, color:"#9aa3b5"}],
  likes:[
    {id:"night", re:/\b(night owl|nights?\b|midnight|full moon|the moon|darkness|insomnia|nocturnal|stay up late|after dark|candle|mornings? (are|is) (a crime|the worst|awful|terrible|evil)|hate (the )?mornings?|not a morning person)/i, d:6, dir:"You're charmed to meet a fellow creature of the night."},
    {id:"weird", re:/\b(weird|strange|odd|i collect|collection|hobby|lonely|confess|secret|nervous|awkward|honestly)/i, d:7, dir:"You find their strangeness delightful. Lean in."},
    {id:"culture", re:/\b(wine|vintage|sommelier|opera|poetry|poem|old books?|antique|history|theat(re|er)|velvet|harpsichord|candlelight|ballroom|waltz)/i, d:6, dir:"You light up: you adore old and beautiful things."},
    {id:"praise", re:/\b(your (eyes|voice|coat|style|taste|accent|cape|manners)|elegant|charming|mysterious|handsome|old-fashioned|gentleman|dapper|stylish|distinguished|well dressed|you look (\w+ )?(nice|good|great|lovely|sharp|wonderful))/i, d:6, dir:"You preen a little at the compliment."}
  ],
  dislikes:[
    {id:"garlic", re:/\b(garlic|pesto|aioli|scampi)/i, d:{SUSPICION:20, AFFECTION:-2}, dir:"Garlic! You recoil, then cover it with a polite excuse."},
    {id:"sun", re:/\b(sun|sunny|sunlight|daylight|daytime|brunch|beach|tan\b|noon|sunrise|morning)/i, unless:/mornings? (are|is) (a crime|the worst|awful|terrible|evil)|hate (the )?(mornings?|sun)|not a morning person|avoid the sun/i, d:{SUSPICION:12}, dir:"Daylight makes you nervous. Make an elegant excuse and change the subject."},
    {id:"hunter", re:/\b(stake|wooden|cross\b|crucifix|holy|church|priest|silver|hunter|van helsing|choir)/i, d:{SUSPICION:24}, dir:"That makes you deeply uneasy. Go very still and ask a careful question."},
    {id:"mirror", re:/\b(mirror|selfie|photo|picture|reflection|camera)/i, d:{SUSPICION:12}, dir:"You have no reflection. Deflect, oddly camera-shy."},
    {id:"pry", re:/\b(how old|your age|what year|were you born|centur|ancient|immortal|vampire|undead|blood|fangs|bite|pale|you'?re not eating|why aren'?t you eating)/i, d:{SUSPICION:15}, dir:"Laugh it off a little too quickly and change the subject."}
  ],
  reactions:{delighted:["You're enchanted and let your guard down a little.","You laugh, delighted, and flirt theatrically."],pleased:["You're pleased. Flirt a little, theatrically.","You're warming to them."],neutral:["You're politely interested.","You're courteous but distant."],annoyed:["You're put off and a little wary.","You're uncomfortable and want to change the subject."],offended:["You're offended. Be cold.","You're insulted. Be icy and formal."]},
  examples:{good:["I'm a total night owl. Mornings are a crime.","I collect old keys. Weird hobby, I know.","Your accent is lovely. Where is it from?"],bad:["You're kind of creepy, honestly.","Can we hurry up? I'm bored.","Ugh, you're so old-fashioned."],neutral:["The bread is nice.","ok"]},
  sugg:["Sorry, I had garlic bread on the way here.","I'm a total night owl. Mornings are a crime.","I collect antique keys. Weird hobby, I know.","Want to grab brunch tomorrow? Somewhere sunny.","What wine goes with a full moon?","Let's take a selfie for my mom!","You have a very old-fashioned way of talking. I like it.","So how old are you, really?","Honestly, I'm a little nervous. First dates are hard.","I just came from church choir practice.","Why aren't you eating?","Do you like the opera?"],
  endings:{
    win:{title:"Bitten (figuratively)", text:"Ezra confesses everything and asks if you'd like to see the city from a rooftop at midnight. You say yes.", dir:"You've fallen for this person. Confess, dramatically, that you are a vampire, and invite them to a rooftop at midnight."},
    lose:{title:"Exposed", text:"Ezra's eyes narrow. 'Hunter.' The candles gutter. When they relight, his chair is empty.", dir:"You are now certain this person is a vampire hunter. Say one chilling line before you vanish."},
    good:{min:50, title:"Second date?", text:"Ezra pays in coins three centuries old and asks if you're free next Tuesday, after dark.", dir:"The date is ending. You liked them. Ask, theatrically, for a second date after dark."},
    timeout:{title:"Into the fog", text:"Ezra pays the bill and vanishes into the fog. A second date? Unclear.", dir:"The date is over. Say a polite, theatrical goodbye."}
  }},
{ id:"tollbridge", title:"The Goblin Tollbridge", genre:"tabletop", engine:"dice", runtime:"pocket", motif:"bridge", colors:["#1f3326","#b6f23a","#f2c14e"],
  character:"Grukk", narrator:"Narrator", blurb:"A d20 encounter. A goblin with a crossbow wants 10 gold to let you cross. You have 6. Fight, talk, bribe or sneak, with real dice and real hit points.",
  persona:"You are Grukk, a greedy, cowardly, pompous goblin who guards a rope bridge with a rusty crossbow. You are very proud of your tiny hat. You talk in short, cocky, broken sentences and call the player 'bridge-walker'.",
  voice:["Hat tax not included, bridge-walker.","You scratch the hat, you pay double!","Grukk not scared. Grukk is tactically worried."],
  opening:"Fog curls off the chasm. A goblin in a tiny hat steps onto the bridge and levels a rusty crossbow at you. \"Toll's ten gold,\" says Grukk. \"Or the long way down.\"", voiceOpening:"Toll's ten gold, bridge-walker. Or the long way down.", noNumbers:true,
  turns:12, stats:[{key:"HP", label:"Your HP", start:12, min:0, max:12, color:"#b6f23a"},{key:"GRUKK", label:"Grukk HP", start:14, min:0, max:14, color:"#ff4d4d"},{key:"TOLL", label:"Toll (gold)", start:10, min:0, max:20, color:"#f2c14e"},{key:"GOLD", label:"Your gold", start:6, min:0, max:20, color:"#f2c14e"}],
  sheet:{STR:2, DEX:1, CHA:1, WIS:0},
  sugg:["I draw my sword and attack Grukk.","I compliment Grukk's magnificent hat.","I try to sneak past while he counts his coins.","I offer Grukk 4 gold.","I pay the toll.","I search the planks for loose coins.","I tell Grukk the bridge looks unsafe, so it should be cheaper.","I tell him a riddle."],
  endings:{timeout:{title:"Nightfall", text:"Night falls. Grukk yawns, pulls a blanket over his hat and refuses to discuss it further.", dir:"It's getting dark. Tell the bridge-walker the bridge is closed for the night."}}},
{ id:"bazaar", title:"The Brass Bazaar", genre:"roleplay", engine:"barter", runtime:"pocket", motif:"bazaar", colors:["#3b1d0e","#ff8a3d","#ffd166"],
  character:"Ilse", blurb:"A music box that hums tomorrow's weather. Old Ilse wants 240 crowns. You have 90, a silver tongue, and maybe something to trade.",
  persona:"You are Old Ilse, a shrewd, funny merchant at a crowded brass bazaar. You are selling a music box that hums tomorrow's weather when wound. You love haggling, you love flattery, and you hate being insulted.",
  voice:["My dear, the box would weep.","Flattery is free. The box is not.","Now that is an offer I can almost hear."],
  opening:"Ah, you've an eye for it! Wind it up and it hums tomorrow's weather. Two hundred and forty crowns, and I'm robbing myself.",
  turns:12, budget:90, floor:70, noNumbers:true,
  stats:[{key:"PRICE", label:"Asking price", start:240, min:0, max:999, mode:"set", color:"#ff8a3d"},{key:"PATIENCE", label:"Ilse's patience", start:100, min:0, max:100, loseBelow:0, color:"#ffd166"}],
  sugg:["It's lovely, but 240 is robbery. I'll give you 60.","What weather is it humming for tomorrow?","Who made it? It looks very old.","I'll give you 80 and my brass compass.","You have wonderful taste, madam. Would you take 100?","That's a scam and you know it.","Fine. 90, final offer.","Deal."],
  endings:{timeout:{title:"Stall closed", text:"Ilse closes her stall. 'Come back when you know what you want, dear.'", dir:"You're closing up for the day. Tell the customer to come back when they know what they want."},
    lose:{title:"Thrown out", text:"Ilse throws a sheet over the music box. 'We're done here.'", dir:"You've lost all patience with this customer. Throw a sheet over the music box and send them away."}}}
];
/*CARTS-END*/
