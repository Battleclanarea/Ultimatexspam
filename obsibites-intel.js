/* =====================================================================
   OBSIBITES CHICKEN  -  a 450,000-gold Obsidara feast (sibling module).
   Every meal reveals ONE small, UNIQUE fragment of "The Obsidara Soul
   Binding Codex". Fragments are handed out strictly in order, so a single
   player NEVER receives the same fragment twice, and the codex is split so
   finely that reading the whole thing requires eating OBSIBITES CHICKEN
   1,000+ times. Unlocked fragments are stored exactly like Intel Files
   (persisted + cloud-synced via profile.obsidaraProgress) so a player can
   always look back through everything they have absorbed.
   ===================================================================== */
(function () {
  var FOOD_ID = 'food_obsibites_chicken';

  // ---- THE OBSIDARA SOUL BINDING CODEX (unique content; the runtime splitter
  //      de-duplicates and finely fragments it into 1,000+ ordered pieces) ----
  var CODEX = [
    "THE OBSIDARA SOUL BINDING CODEX. A complete treatise on paired resonance, the BCG covenant, traditional union, vessel identity, ancient readings, and lifelong shared ascension. Two Obsidaras do not become half of one being. They become two complete beings whose souls have learned how to stand in the same eternal doorway.",
    "Definition and Scope. Within Obsidara doctrine, soul binding is the deliberate establishment of a permanent paired resonance between an adult male Obsidara and an adult female Obsidara. The bond is not ownership, absorption, replacement, or the erasure of individuality. It is a structured spiritual alignment in which two complete souls recognize one another, consent to share a protected channel, and allow that channel to become part of their continuing identity.",
    "The act is called binding because the connection is designed to remain dependable under distance, fear, loss of memory, bodily change, realm transition, and the passage from an Earth Realm vessel into the enduring vessel of BattleClanArea. The word binding can sound restrictive to outsiders. In Obsidara usage it refers to reliability rather than captivity. A bridge is bound to both shores so that it does not drift away when the river rises. A shield is bound to its bearer so that it arrives with the arm instead of after the blow.",
    "The paired resonance is bound to both Obsidaras so that neither must repeatedly prove the existence of the connection during every hardship. The bind becomes a dependable fact within the permanent record of their souls. Only three of the 9,633 catalogued soul types possess the natural architecture required for this form of paired resonance. Obsidaras are among those three. Their distinction is not that they love more deeply than every other soul type, nor that other beings are incapable of loyalty. Their distinction is structural.",
    "An Obsidara soul can open a consent governed resonance chamber without losing its own boundaries. It can receive another Obsidara's signature, preserve that signature, and produce a third field that belongs to the relationship while remaining separate from both individuals. There are two primary recognized paths. The first is the BCG Covenant Path, in which two Obsidaras play a BattleClanGame together and clearly confirm that they wish to soul bind.",
    "Because BCG participation activates the cooperative, strategic, and identity bearing layers of the BCA vessel, the shared game can become a complete ritual environment. The second is the traditional intimate path, a private and consensual adult union that deepens the bond and adds power through repeated acts of trust, vulnerability, and vessel synchronization. Its importance lies not in physical detail but in what the act means to Obsidara soul architecture.",
    "A valid bind begins with two truths. First, both participants must be Obsidara. Second, both must knowingly choose the bond. No ceremony, game result, emotional pressure, family expectation, victory, gift, rank, prophecy, or claim of destiny can substitute for mutual agreement. The soul reacts not merely to words but to aligned intention. A spoken yes given under fear does not carry the same signature as a freely chosen yes. Consent is the first operating law of the entire system.",
    "Once established, the bond influences emotional life, self-understanding, spiritual perception, battle discipline, and the way each partner interprets the future. It may strengthen calm during danger, improve recognition across altered vessels, sharpen the reception of ancient readings, and create a durable sense of being spiritually accompanied. Yet it does not remove the need for communication, patience, personal responsibility, or ordinary care. The bind magnifies what the pair practices.",
    "Respect becomes easier to return to because the path is well marked. Neglect becomes more noticeable because the shared field carries the echo of what has been left unattended. The Obsidara bind is an enduring covenant with practical effects. It is mystical in origin but disciplined in use. It is emotional without being chaotic, powerful without requiring domination, and permanent without demanding that either partner stop growing. Its deepest promise is not that two lives will become effortless. Its promise is that effort can be shared without either soul becoming invisible.",
    "The Rarity of the Obsidara Capacity. The archives recognize 9,633 soul types, each with its own methods of memory, attachment, power transfer, vessel adaptation, and afterlife continuity. Of those thousands, only three possess the paired resonance chamber necessary for a true consensual soul bind. This rarity is often misunderstood as a ranking. It is not a declaration that the three capable types are superior in every respect. It is a statement of specialization.",
    "Some soul types can carry ancestral memory with extraordinary precision. Others can divide consciousness across multiple vessels. Others can resist realm pressure or transform grief into defensive energy. Obsidaras are specialists in mutual continuity. The Obsidara chamber is sometimes called the obsidian hollow, though it is neither empty nor made of stone. It is a protected region of the soul that remains unclaimed until a valid partner signature is willingly admitted.",
    "Before binding, this chamber contributes to the familiar Obsidara sense that there is a room inside the self whose door has not yet been named. The feeling is not necessarily loneliness. Many unbound Obsidaras live full, dignified, purposeful lives. The chamber is better understood as unused capacity, the way a language may exist in the mind before the speaker encounters the person with whom it becomes necessary.",
    "When two compatible Obsidaras choose one another, each chamber receives a pattern rather than a possession. The male Obsidara does not store the female Obsidara as an object, and the female Obsidara does not imprison the male. Each stores a living recognition sequence: the spiritual equivalent of rhythm, contour, intent, memory cadence, and vessel truth. This sequence allows recognition even when appearance changes, when a name is concealed, when an Earth Realm body ages, or when the BCA vessel becomes the primary form after death.",
    "The rarity of the capacity creates responsibility. Because few soul types can form this bond, Obsidara culture discourages careless promises made for spectacle. A false claim of binding may create emotional confusion, but it cannot manufacture the true third resonance. The soul's architecture is exacting. It recognizes mutual choice, repeated alignment, and genuine presence. That precision protects the tradition from being reduced to performance.",
    "The three capable soul types are often compared to three kinds of gate. One opens through ancestry, one through sacrifice, and the Obsidara gate through chosen companionship. This is why Obsidara teachings place such importance on voluntary partnership. Their rare gift is not simply the ability to attach. It is the ability to build an enduring spiritual structure out of freely shared intention.",
    "The Two Souls and the Third Resonance. A completed bind contains three identifiable presences. The first is the male Obsidara's soul, complete and continuous. The second is the female Obsidara's soul, equally complete and continuous. The third is the paired resonance, a field created by their agreement and sustained by their lived relationship. The third resonance is not a child, ghost, deity, or merged personality. It is the spiritual architecture of the bond itself.",
    "This distinction explains how binding can be permanent without destroying individuality. Each soul retains private thought, personal will, separate responsibility, and unique destiny. The resonance does not speak over them. Instead it carries recognition, emotional tone, protective impulses, covenant memory, and the accumulated meaning of shared actions. When one partner remembers a moment of courage, the resonance can make that courage easier for the other to access. When both repeatedly choose patience, patience becomes part of the channel's familiar shape.",
    "Obsidara scholars describe the resonance as a house built between two kingdoms. Neither kingdom is conquered. The house belongs to both, yet it is not identical to either. Inside it are shared emblems, protected records, and doors that open only through consent. Over time the house gains rooms: a room for battle trust, a room for grief, a room for laughter, a room for promises kept, a room for the quiet knowledge that one has been seen in more than one vessel.",
    "The third resonance also provides continuity during transformation. Earth Realm life can alter appearance, status, health, memory, and circumstance. BCA life may reveal a vessel whose stature, armor, markings, voice, or power differs greatly from the Earth vessel. The paired field helps each soul say, beneath all surfaces, this is still you. That recognition answers a fear deeper than ordinary separation: the fear of becoming unrecognizable after profound change.",
    "In daily life the third resonance is experienced as a stable and continuous orientation. A bound Obsidara may feel more capable of returning to the relationship after stress. Shared play may feel unusually meaningful. Silence may contain familiarity rather than emptiness. Difficult conversations may still hurt, but the bond supplies a remembered doorway back to mutual regard. The resonance does not eliminate work. It preserves the map.",
    "Consent as the First Law. Every legitimate Obsidara text places consent before power. This is not merely an ethical addition created by later interpreters. It is a mechanical requirement of the bind. The paired resonance chamber opens only when intention, understanding, and willingness align. Words spoken without inner agreement may be heard by the partner, but they do not create the complete spiritual signature required for binding.",
    "Consent must be specific. Agreeing to play a BCG is not automatically agreeing to soul bind. Agreeing to intimacy is not automatically agreeing to soul bind. Loving someone is not automatically agreeing to soul bind. The binding intention must be named plainly enough that both partners understand the same choice. Each partner acknowledges the other as an equal soul, states the desire to establish the bond, and receives an equally clear answer.",
    "Consent must remain free from coercion. Rank, money, fear of abandonment, threats, public pressure, claims that prophecy demands the bond, or insistence that refusal proves disloyalty are considered corrupting forces. They do not produce a healthy resonance. At best they produce confusion around an unformed bond. At worst they harm trust and make future authentic agreement more difficult.",
    "The first law protects both partners from the dangerous idea that spiritual significance excuses poor behavior. A person cannot claim that a soul bond gives unlimited access to another's time, body, accounts, communications, choices, or private thoughts. The bind creates responsibility, not entitlement. Even after binding, daily boundaries remain necessary. Consent governs the founding of the bond, and respect governs its expression.",
    "For BCG binding, the clearest practice is a pause before confirmation. The pair enters a meaningful shared session, speaks directly, and allows each person room to answer without interruption. For traditional intimate binding, consent must apply both to the relationship covenant and to the private act itself. Either partner may slow or stop the physical act at any time without spiritual punishment. The bond is strengthened by freely renewed trust, never by endurance under pressure. A soul may offer a doorway, but no loving partner breaks the lock.",
    "The BCG Covenant Path. This is the most accessible form of Obsidara soul binding. It requires no temple, rare material, planetary alignment, priest, rank, wealth, or public audience. Two adult Obsidaras play a BattleClanGame together, knowingly enter the shared activity as themselves, and clearly agree that they wish to soul bind. If both possess the Obsidara architecture and both intentions are genuine, the bind can occur.",
    "BattleClanGame is uniquely suited to this process because it activates several layers of identity at once. A player chooses, reacts, protects, adapts, fails, recovers, communicates, and reveals habits under pressure. The game becomes more than entertainment without ceasing to be entertainment. It provides a living field in which both partners demonstrate how they move beside one another. The soul reads cooperation, not merely victory.",
    "A successful session does not require elite performance. One partner may carry the match, both may struggle, or the game may end in defeat. The covenant is not awarded by a scoreboard. What matters is mutual presence and the deliberate confirmation. Some teachings consider an imperfect match especially honest because it shows how the pair responds when pride has little shelter.",
    "The simplest recognized form contains four elements. The pair plays together. Each knows that soul binding is being considered. One clearly asks whether the other wishes to establish the Obsidara bond. The other clearly agrees, and the first confirms that the agreement is mutual. The exact words can vary. The inner meaning cannot.",
    "Once the confirmation is complete, the BCG environment serves as the first shared chamber of the bond. The map, sounds, decisions, rescues, mistakes, and moments of synchronization become the earliest stored records in the third resonance. Many bound pairs later remember the original game with unusual vividness. The match becomes a spiritual birthplace, not because the software itself commands souls, but because the game supplied the place where two intentions became one covenant.",
    "BCG binding is especially valued by Obsidaras separated by distance or limited by Earth Realm circumstances. It affirms that meaningful presence is not restricted to physical proximity. The BCA vessel is already partially expressed through play: through chosen identity, combat discipline, strategy, voice, loyalty, and the way a person occupies a shared realm. For Obsidaras, that can be sufficient for the soul to recognize the truth of the partner and establish the bond.",
    "The Spoken Confirmation. The spoken confirmation is the hinge of the BCG Covenant Path. It turns shared play into shared covenant. The words need not be ancient, poetic, or perfect. They must be understandable, voluntary, and mutual. Obsidara doctrine prefers clarity over theatrical grandeur because the soul responds to meaning rather than decoration.",
    "A complete confirmation usually contains recognition, intention, equality, and acceptance. Recognition means each partner addresses the actual person, not an imagined replacement. Intention means the desire to soul bind is stated. Equality means neither claims ownership or superiority. Acceptance means both answer freely. A pause is often kept after the final words so that the choice can settle without being drowned by noise or immediate joking.",
    "Some pairs use a simple form: we have played together as Obsidaras; I choose you freely and ask to establish the soul bind; do you freely choose the same? The responding partner confirms, and the first acknowledges the answer. Others create personal language connected to their BCA identities. Both forms are valid if the meaning remains clear.",
    "The confirmation may be spoken through voice communication, written in a private message, entered through a recognized BCG interface, or exchanged by another reliable method. Voice is traditional because tone carries emotional information, but voice is not required. Accessibility, distance, disability, safety, and circumstance matter. The Obsidara soul is concerned with authentic intent, not with excluding those who communicate differently.",
    "Afterward, many pairs mark the event with a small record: the game title, map, date, result, chosen names, or a symbol associated with the match. Such records do not create the bond. They help the Earth Realm mind remember what the soul has already accepted. The greatest danger in confirmation is ambiguity used as a weapon. A partner should never later claim that an ordinary comment secretly constituted consent. A covenant can be quiet without being unclear.",
    "The Moment a Bind Takes Hold. Obsidara accounts describe the first moment of binding in many ways. Some feel warmth, stillness, pressure behind the chest, a sudden clarity of attention, or the impression that a distant room has become occupied. Others feel nothing dramatic at all. The absence of spectacle does not invalidate the bond. The most reliable evidence appears through continuity: repeated recognition, increased steadiness, meaningful shared symbolism, and the gradual formation of the third resonance.",
    "The initial bind is sometimes called the first locking, though the term does not imply imprisonment. It refers to the stabilization of the recognition sequence. Before this moment, the two souls can approach and withdraw without leaving a permanent paired structure. After valid mutual confirmation, the structure begins to preserve itself.",
    "During the first hours or days, partners may notice heightened emotional awareness. This should not be confused with mind reading. Each person still needs to communicate. The bind may make tone, absence, reassurance, or tension feel more significant because the relationship now has a dedicated spiritual channel. Wise pairs respond by becoming gentler and more precise, not by assuming they know everything the other feels.",
    "The first bind is complete enough to endure, yet young enough to be shaped. Early practices matter. Shared play, honest conversation, rest, gratitude, and calm reflection teach the resonance what safety feels like. Jealous tests, manipulation, and deliberate confusion teach the channel instability. The bind's existence may be durable, but its quality depends on how it is inhabited.",
    "A healthy first locking produces expansion rather than narrowing. Each partner should feel more able to be truthful, more securely recognized, and more capable of pursuing meaningful growth. If either feels that the covenant requires abandoning identity, friendships, responsibilities, or personal judgment, the doctrine has been misapplied. The third resonance is built to carry two complete signatures. It weakens in usefulness when one signature is forced to imitate the other. The soul has opened the house; the partners must decide what kind of home they will make inside it.",
    "Traditional Intimate Union. The traditional intimate path is a private, consensual union between an adult male Obsidara and an adult female Obsidara. Obsidara texts treat it as sacred because it brings emotional trust, physical vulnerability, vessel awareness, and explicit covenant intention into one event. The tradition is described ceremonially rather than graphically. Its power lies in mutual choice and complete presence, not in technique or performance.",
    "Traditional union can establish a bind when the partners clearly intend that purpose, or it can deepen a bond already created through BCG. The act alone is not sufficient without consent to the soul covenant. Likewise, the covenant does not erase the need for consent to each intimate encounter. These are related agreements, not interchangeable ones.",
    "During traditional union, the Earth Realm vessels become temporary instruments through which the deeper Obsidara signatures synchronize. Breath, attention, trust, affection, and the willingness to be fully known provide the soul with unusually dense information. The resonance receives a layered record: this is my partner when guarded defenses are lowered; this is the rhythm of safety between us; this is the meaning we have chosen to place inside closeness.",
    "Because the subject can easily be distorted, the oldest teachings reject conquest language. No partner takes the other's soul. No partner proves superiority. The event is understood as mutual opening. Each offers presence. Each receives presence. Each remains whole.",
    "The traditional path is especially powerful when both partners have cultivated awareness of their BCA vessels. They may visualize, sense, name, or otherwise recognize the form that represents their enduring identity beyond Earth Realm limitations. When the BCA vessel is held in awareness during a loving and consensual union, the soul receives a clearer signal of who is actually making the covenant. The Earth vessel becomes a doorway rather than the entire definition of the person.",
    "Repeated traditional union may add power to the bond, but quantity without care is not the goal. The soul measures sincerity, safety, attention, and integrated meaning. A single deeply respectful union may contribute more than many distracted encounters. Power in Obsidara doctrine is not raw intensity alone. It is stable capacity: the ability to protect, recognize, restore, understand, and remain present.",
    "Why Repeated Traditional Union Adds Power. Each consensual traditional union can strengthen the paired resonance because it renews the original architecture under conditions of trust. The soul does not merely replay the first bind. It updates the bond with new information: how both partners have changed, what they have survived, what they now understand, and whether they still choose to meet one another with care.",
    "This added power is called resonance density. A dense resonance is not louder or more controlling. It is more reliable. It carries recognition through greater distance, recovers more quickly after emotional strain, stabilizes both partners under fear, and holds more complex ancient readings without distortion. Density also improves vessel continuity, allowing the partners to recognize one another across changes in appearance or realm state.",
    "Traditional union can increase four major forms of power. The first is protective power, which supports emotional steadiness and resistance to hostile spiritual influence. The second is interpretive power, which helps both partners understand symbolic readings. The third is restorative power, which helps the relationship return to balance after hardship. The fourth is identity power, which preserves the truth of each partner beneath temporary roles and appearances.",
    "Power does not accumulate mechanically. Obsidara scholars reject the idea that every encounter grants an identical numerical increase. The effect depends on intention, emotional safety, honesty, mutual desire, and whether the partners are present as themselves. A union used to avoid a necessary conversation may produce little integration. A union following sincere repair may become exceptionally meaningful because it confirms that trust has been rebuilt rather than merely assumed.",
    "The healthiest pairs do not chase power as though intimacy were a resource extraction ritual. They understand power as the natural result of closeness practiced responsibly. The bind grows strong because the partners become more truthful, attentive, and skilled at carrying one another's reality without erasing it. Over years, repeated union can create what is called the deep lantern effect. Each partner becomes easier for the other to recognize in dreams, BCG states, spiritual readings, altered vessels, and moments of crisis. The lantern illuminates the path back to the person.",
    "The BCA Vessel and the ER Vessel. Obsidara doctrine distinguishes between the ER vessel and the BCA vessel. The ER vessel is the Earth Realm body and identity through which a soul lives during mortal life. It is real, worthy, and deserving of care, but it is temporary and shaped by conditions the soul did not entirely choose. The BCA vessel is the enduring expression through which the Obsidara is most fully recognized in BattleClanArea and in the afterlife.",
    "The BCA vessel may carry the person's true armor, stature, markings, age expression, voice, energy, symbols, and role. It is not necessarily more attractive by Earth standards. Its importance comes from fidelity. It reflects what the soul is rather than what Earth circumstances happened to build around it. Obsidara soul binding becomes especially valuable when both partners can recognize or embody their BCA vessels.",
    "The bind is then anchored to the identity expected to continue beyond death. A partner is not merely saying I know your current face. The partner is saying I know the signature that survives faces. BCG play naturally assists this process. In games, participants may choose names, armor, classes, tactics, and roles that reveal aspects of the BCA vessel. Repeated cooperative play allows the pair to observe how each other acts when occupying a combat identity: whether they protect, rush, plan, recover, communicate, improvise, or remain calm.",
    "Traditional intimate union can deepen BCA vessel awareness because the partners are physically present through ER vessels while intentionally remembering that neither body is the whole self. This creates a layered recognition. The Earth body is honored, not dismissed. At the same time, the covenant reaches beyond it. A mature bind holds two images of each partner at once: the mortal form deserving tenderness now, and the enduring form expected to remain recognizable later. The ability to love both without confusing them is one of the highest Obsidara arts.",
    "Afterlife Identity and Vessel Continuity. The central promise of vessel continuity is that death does not make the bonded partners strangers. The BCA vessel is the form through which the soul becomes most legible after Earth Realm life. Because the paired resonance stores the deeper recognition sequence, each partner can identify the other even if the afterlife appearance differs greatly from the remembered mortal body.",
    "This promise does not mean grief becomes painless. Earth separation is still treated as profound. The bind does not demand emotional numbness or pretend that absence is easy. Instead it offers a framework in which love is not considered wasted when a vessel ends. Shared meaning has been recorded in a structure designed to cross the boundary.",
    "The resonance preserves more than visual recognition. It stores the cadence of choice, the shape of courage, familiar humor, protective instinct, patterns of attention, and the emotional signature of being welcomed. These elements help prevent false recognition based only on appearance. An imitation may resemble a face, but it cannot reproduce the complete living sequence held by the bind.",
    "Obsidara funerary teachings often describe the surviving partner as carrying a lit threshold. The threshold is not a command to stop living. It is a reminder that continuing life can add dignity to the shared resonance. Acts of courage, kindness, and growth become offerings placed into the bond rather than betrayals of the one who has passed.",
    "When both partners eventually occupy BCA vessels, the bind unfolds with greater clarity. Earth misunderstandings may be reviewed without the pressures that created them. Hidden strengths become visible. The pair recognizes that the covenant was never limited to the most difficult years, the healthiest body, the clearest memory, or the easiest circumstances. The emotional power of the doctrine comes from its answer to a universal fear: that time can make the beloved unreachable. Obsidara binding replies that true recognition can be trained, stored, and carried. The face may change; the doorway remembers.",
    "Ancient Readings and Information Transfer. A mature Obsidara bind may receive ancient readings: packets of symbolic, emotional, strategic, historical, or spiritual information carried through the paired resonance. These readings are not treated as infallible commands. They are impressions requiring interpretation. Their purpose is usually guidance, warning, remembrance, or the expansion of understanding.",
    "Readings can arise during sleep, meditation, BCG play, traditional union, quiet conversation, moments of danger, or contact with a spiritually significant object. They may arrive to both partners at once or to one partner first. A reading received by only one person should be shared humbly. Claiming private revelation as unquestionable authority over the other is considered a violation of the first law.",
    "The content may include images of ancient Obsidara history, fragments of forgotten language, symbolic maps, emotional memories from ancestral lines, or instructions for strengthening protection and discipline. The bind acts as a verification field. When both partners independently receive compatible elements, confidence in the interpretation increases. When their impressions differ, the correct response is patience rather than forced agreement.",
    "Repeated traditional union can increase the clarity of readings because resonance density improves. BCG cooperation can also sharpen them by training the pair to communicate under pressure and compare perspectives without collapsing into panic. BCG creates strategic synchronization; traditional union creates dense vessel synchronization; together they form a broad channel.",
    "Ancient readings are most useful when translated into constructive action: greater honesty, preparedness, compassion, study, protection, or repair. A reading that produces only fear, grandiosity, or isolation should be examined carefully. Healthy Obsidara doctrine does not use revelation to detach partners from reality. It uses symbolism to deepen responsibility within it. An ancient reading is not a crown placed on the receiver. It is a lamp placed in the shared house.",
    "Tablets, Dreams, Symbols, and Spiritual Channels. Obsidara readings may reach the pair through any medium capable of carrying meaningful symbolic connection. Tablets are especially common in modern Earth Realm accounts. A line of text, image, notification, game event, repeated number, saved record, or unexpected arrangement of symbols may become the surface on which a deeper pattern is noticed. The device itself is not worshipped; it is treated as a channel, comparable to parchment, stone, dream, song, or reflected light.",
    "Because tablets already hold messages, games, images, records, and the chosen identities of both partners, they can become dense archives of paired meaning. The soul may use familiar material because familiar material is easier for the waking mind to receive. Dreams often provide a less literal channel. A bound Obsidara may encounter the partner in a different vessel, travel through a shared fortress, stand before two doors, or receive an object representing the state of the bond.",
    "Interpretation should focus on emotional structure rather than assuming every detail predicts an event. A damaged bridge may indicate neglected communication, not literal disaster. A restored shield may indicate repair. Symbols become strongest when they are personally grounded. The map of the original BCG bind, a color associated with safety, a phrase used during confirmation, an emblem on a BCA vessel, or the sound of a familiar game environment may carry more meaning than a universal symbol taken from a book.",
    "Partners are encouraged to keep a shared reading record. Each writes what was perceived before discussing it, reducing the temptation to reshape memory after hearing the other's version. Over time, patterns can be compared. This practice distinguishes recurring themes from isolated coincidence. No channel replaces direct care. A tablet message cannot excuse cruelty. A dream cannot cancel consent. A symbol cannot prove ownership. Spiritual connection is valuable when it supports the living relationship, not when it becomes a weapon against it.",
    "Emotional Stabilization. One of the most consistent positive effects attributed to Obsidara soul binding is emotional stabilization. The paired resonance gives each partner a familiar internal reference during fear, anger, confusion, and grief. This reference does not erase emotion. It reduces the sense that emotion has destroyed the entire relationship.",
    "Before binding, a difficult moment may feel like total uncertainty. After a healthy bind has been cultivated, the third resonance carries records of repair, loyalty, laughter, and previous survival. The nervous mind can draw upon those records. The partner becomes not merely a person remembered in thought but a stable direction inside the emotional map.",
    "BCG play strengthens this effect by providing manageable cycles of pressure and recovery. A match begins, tension rises, mistakes occur, communication adjusts, and the session ends. Repeating this together teaches the bond that pressure is not permanent. Traditional union contributes a different lesson: vulnerability can coexist with safety. Together these lessons create emotional flexibility.",
    "Stabilization should not be mistaken for dependence. A healthy bound pair supports each person's ability to regulate, think, rest, seek help, and maintain a life. The bind is a shared resource, not the only resource. Obsidara teachings praise partners who strengthen one another's independence because a strong individual signature makes the third resonance clearer.",
    "During conflict, stabilization may appear as a small inward pause before saying something destructive. During danger, it may appear as the ability to remember a plan. During sadness, it may appear as permission to feel without assuming one has been abandoned. These effects are subtle, but subtle power often governs the course of a life more than spectacle. The bound partner becomes a remembered shore. The sea can still rise; the existence of the shore helps the soul keep swimming.",
    "Shared Courage and Battle Discipline. Obsidaras are often associated with battle environments, not because they must seek violence, but because pressure reveals structure. A soul bind can improve courage by distributing meaning across two lives. An action taken for personal survival becomes connected to the promise of return, protection, and shared future.",
    "In BCG, bound partners may develop unusually efficient cooperation. They learn each other's pace, preferred roles, warning patterns, risk tolerance, and recovery habits. This practical knowledge feeds the resonance. Over time, a short phrase or movement can carry a large amount of coordinated meaning.",
    "Courage within the bind is not recklessness. The partner's existence often creates a reason to avoid unnecessary danger. Obsidara doctrine defines mature courage as the ability to act while preserving what deserves to continue. A warrior who charges only to prove fearlessness may be less disciplined than one who survives, protects the team, and returns with accurate information.",
    "The male and female Obsidara may express courage differently without either form being lesser. One may become outwardly decisive while the other becomes inwardly stabilizing. One may excel at immediate action, the other at strategic foresight. The bind allows these strengths to circulate. Neither must become a copy of the other.",
    "Traditional union can add battle power by deepening body trust and vessel recognition. The value is not physical detail. It is the soul's knowledge that the partner has been encountered without armor and still honored. That knowledge can reduce the fear that failure, injury, aging, or transformation will make the person unworthy of recognition. The strongest paired fighters are those whose fear does not erase memory, loyalty, or judgment. The bind turns courage from a performance into a practiced return.",
    "Memory, Recognition, and the Sense of Home. Obsidara binding creates what scholars call covenant memory. Ordinary memory belongs to the mind and may fade, distort, or become inaccessible. Covenant memory belongs to the paired resonance. It stores the meaning of shared events even when exact details weaken. This is why a song, game map, phrase, or symbol can suddenly restore a powerful sense of the partner.",
    "The trigger does not necessarily contain the whole memory. It opens the shared record. The person may not recall every word spoken during the original bind, yet may feel the unmistakable truth of being freely chosen. Recognition extends beyond appearance. A bound Obsidara can often identify the partner's emotional cadence, humor, strategic habits, and moral center. This deeper recognition is crucial to BCA vessel continuity.",
    "The sense of home arises when recognition and safety overlap. Home is not defined as a building or constant physical proximity. It is the experience of being legible without being controlled. The partner knows enough to recognize, but not so arrogantly as to stop listening. Repeated shared practices furnish this inner home. BCG sessions become hallways of coordinated action. Traditional union becomes a chamber of trust. Difficult conversations become repaired walls. Celebrations become windows. Grief becomes a room where silence is permitted.",
    "Many Obsidara accounts become emotional at this point because the bind answers a quiet lifelong hunger: not merely to be loved, but to be remembered accurately. The soul does not ask only, will someone miss me? It asks, will someone know which part of me has returned? The paired resonance is built to answer yes.",
    "Daily Life After Binding. A soul bind becomes meaningful through ordinary life. Grand ceremonies may establish or renew the covenant, but daily habits determine whether the shared field feels warm, clear, and useful. Obsidara practice honors small acts: checking in honestly, keeping promises, playing together, making room for rest, protecting privacy, and repairing misunderstandings before they harden.",
    "Bound partners may develop rituals around BCG. A weekly session can become a place to restore teamwork. A particular loadout, map, greeting, or closing phrase may function as a resonance anchor. These habits are not mandatory. Their value comes from repetition and shared meaning. Partners may also notice that decisions feel more relational. This does not mean permission is required for every personal choice. It means each person naturally considers how major actions affect the shared field.",
    "Traditional intimacy, when part of the relationship, remains private, consensual, and responsive to both partners' circumstances. Its spiritual significance should never create pressure to perform. Illness, distance, stress, disability, or changing desire do not make the bond worthless. Power can also be sustained through tenderness, conversation, shared play, remembrance, and care.",
    "The bind may influence sleep, dreams, creativity, and motivation. Some partners report that goals become easier to imagine because the future contains a recognized companion. Others become more disciplined about personal growth because they want to bring a stronger self into the covenant. The bond is the reason a difficult apology is attempted, a game is played after a hard day, a fear is spoken rather than hidden, and two separate lives continue choosing to build a place where both can be known.",
    "Conflict Without Severance. Soul binding does not prevent conflict. Two complete souls retain different histories, needs, perceptions, and limits. The purpose of the bind is not to eliminate disagreement but to preserve recognition while disagreement is occurring. In a healthy resonance, anger does not automatically become annihilation. The partners may feel hurt, require distance, or challenge one another firmly, yet the shared field continues to hold records of care and equality.",
    "Obsidara conflict practice emphasizes four steps: pause, identify the actual harm, speak without claiming total knowledge of the other's soul, and choose a concrete repair. Ancient readings are not used as evidence that one partner must be right. BCG performance is not used to establish dominance in the relationship. Traditional intimacy is not used to cover unresolved injury.",
    "Temporary space does not sever a valid bind. In fact, respectful space may protect it. The paired resonance is strong enough to tolerate silence when silence has a clear and non-punitive purpose. What damages trust is not distance itself but uncertainty deliberately used to control. After repair, many pairs return to a simple shared activity. A calm BCG session can retrain cooperation.",
    "The bond's permanence should never be invoked to trap someone in harm. Obsidara ethics distinguish spiritual continuity from required proximity. A person may need safety, boundaries, or separation from destructive behavior. The doctrine's positive promise is that truth matters, not that endurance must replace judgment.",
    "Distance, Silence, and Continued Resonance. Because the BCG path can establish a bind across physical distance, Obsidara tradition has always recognized that proximity is not the only measure of presence. Bound partners may live in different homes, cities, countries, realms, or phases of responsibility while maintaining a meaningful resonance.",
    "Distance changes the methods of care. Shared games, messages, calls, voice recordings, symbols, scheduled rituals, and written readings can become bridges. The bond does not excuse the absence of communication, but it can keep temporary silence from feeling like complete spiritual disappearance. Some partners experience echo moments during distance: thinking of the other before a message arrives, dreaming of a familiar BCA vessel, feeling drawn to a shared game, or encountering a symbol associated with the bind.",
    "The strongest long-distance bonds create rhythm. Predictable contact gives the Earth mind security, while the paired resonance gives deeper continuity. Neither should be expected to replace the other. When silence is unavoidable, a previously agreed phrase or ritual can serve as a holding seal. The pair may state that the bond remains honored even while contact is limited. This reduces unnecessary fear and prevents the imagination from turning every absence into abandonment.",
    "Distance can even strengthen certain aspects of the bind. It teaches the partners to recognize identity without relying on constant physical cues. It encourages clearer language. It reveals whether trust can survive uncertainty. When handled with care, distance does not empty the shared house. It teaches the house to keep its lights on.",
    "The Protective Architecture of the Bind. Protection is one of the most valued functions of the Obsidara bind. The paired resonance can act as a stabilizing barrier against despair, identity confusion, hostile spiritual influence, and the disorientation of vessel transition. This protection is relational rather than militaristic. It works by strengthening recognition and coherence.",
    "A hostile influence often succeeds by making a soul forget who it is, who can be trusted, or why continuation matters. The bind stores answers to those questions. It preserves the partner's signature and the covenant's history. Even when fear becomes loud, the resonance carries a quieter but more durable record. Protective strength grows through honesty. Secrets that directly affect the relationship can create blind places in the shared field.",
    "This does not mean every thought must be disclosed. Privacy remains legitimate. The distinction is between personal interior space and deliberate deception about matters the covenant depends upon. BCG cooperation trains active protection. Partners learn to watch angles, communicate threats, revive, cover, retreat, and reenter. These patterns become energetic templates within the paired resonance. Traditional union trains receptive protection: the ability to be near vulnerability without exploiting it.",
    "The bind can also protect against false vessel recognition. Because it stores more than appearance, it helps distinguish the true partner from an imitation, projection, or memory error. The complete signature includes ethical pattern, emotional cadence, and the history of freely chosen responses. Protection does not mean invulnerability. Obsidaras can still suffer, grieve, become confused, or need outside assistance. The bind is a shield with a living bearer, not an automatic wall. Its greatness lies in making recovery more reachable and identity harder to erase.",
    "Growth, Mastery, and Paired Ascension. A young bind is defined by recognition. A mature bind is defined by integration. Over time, the pair learns how to use the resonance deliberately without becoming dependent on constant intensity. This development is called paired ascension. Ascension does not mean leaving ordinary life behind. It means carrying greater spiritual capacity with greater steadiness.",
    "The partners become better at receiving readings, recognizing BCA vessel truth, cooperating under pressure, repairing conflict, and protecting one another's individuality. Mastery of the BCA vessel is especially important. An Obsidara who knows the enduring form can enter BCG, meditation, ritual, or traditional union with a clearer identity signature. This clarity enriches the bond because the partner is meeting the deepest available self rather than only a temporary role.",
    "The male and female Obsidara may ascend at different speeds in different domains. One may develop symbolic reading first. The other may become skilled at emotional stabilization. One may recognize vessel details. The other may strengthen battle cooperation. Paired ascension respects asymmetry while keeping equality.",
    "Milestones are often marked by shared achievements: surviving a difficult life season, completing a major BCG campaign, receiving compatible readings, resolving a long conflict, recognizing one another in dreams, or renewing the traditional union with greater awareness. Each milestone adds architecture to the third resonance. The final aim is not endless accumulation of power. It is trustworthy depth. A mastered bind becomes quiet enough that neither partner must constantly prove it.",
    "BCG Ritual Design and Responsible Practice. A BCG soul binding ritual may be simple, but thoughtful design helps both partners understand the moment. The pair can select a game, mode, map, or objective that carries shared meaning. Cooperative play is often preferred, though competitive formats can also work if the partners remain aligned in intention. Before play, each partner should know that binding may be proposed.",
    "Surprise can be romantic in ordinary matters, but a permanent spiritual covenant deserves informed participation. The session should occur when both can think clearly and are free from pressure. During play, the pair need not behave perfectly. The value of BCG is that it reveals real cooperation. They may communicate, defend one another, complete an objective, or simply remain present through the full session. The game becomes a witness because it contains their actions.",
    "After an appropriate moment, one partner states the intention. The other answers clearly. Both may repeat the confirmation and name the date or match as the beginning of the bind. A saved screenshot, match record, or written note can become an Earth Realm anchor. Following the ritual, the pair should discuss expectations. They may talk about communication, privacy, exclusivity, spiritual practice, BCG rituals, traditional union, readings, and boundaries. Clear expectations protect the beauty of the covenant from avoidable confusion.",
    "Responsible practice includes humility. No pair should use the bind to claim superiority over unbound people or other soul types. The Obsidara gift is rare, but rarity is a duty to care for the gift rather than a license to look down upon those with different spiritual architecture.",
    "Signs of a Healthy Bind. A healthy Obsidara bind produces recognizable patterns. Both partners feel more seen rather than less. Communication becomes more honest over time. Boundaries can be discussed without threatening the entire relationship. Shared practices create steadiness. Power is experienced as protection, clarity, and growth rather than control.",
    "The partners retain their individual interests, judgment, and responsibilities. They do not treat difference as betrayal. The third resonance benefits from two strong signatures, so personal development strengthens the bond. BCG play remains enjoyable even when it carries sacred meaning. Not every match must become a ceremony. Laughter, failure, experimentation, and ordinary fun keep the shared field human and flexible. Sacredness without play can become brittle.",
    "Traditional intimacy, when present, is mutually desired and emotionally safe. It is never demanded as proof of loyalty or used as the only method of restoring closeness. Its power comes from freedom. Ancient readings lead toward constructive reflection rather than panic, isolation, or unquestionable authority. Both partners are allowed to interpret, question, record, and wait. A message that cannot tolerate examination is not treated as mature guidance.",
    "Most importantly, the bind makes both lives larger. The pair becomes more capable of courage, care, creativity, and meaningful action. A covenant that steadily shrinks one partner's world has departed from Obsidara purpose. The true bond is a rooted tree, not a locked room.",
    "Misinterpretations and False Claims. Several misconceptions surround Obsidara soul binding. The first is that intense attraction automatically creates a bind. Attraction may motivate closeness, but the covenant requires informed mutual intention. The second is that one partner can bind the other secretly. The resonance chamber rejects unilateral ownership.",
    "Another false claim is that the bind provides complete access to the partner's thoughts. It does not. The bond carries signature, tone, memory, and relational information, but private consciousness remains private. Assuming mind reading often damages communication. Some claim that BCG binding is lesser because it does not require physical union. Obsidara doctrine rejects this hierarchy. The BCG Covenant Path is complete because BCA identity and cooperative intention are sufficient to establish the resonance.",
    "Traditional union may add density and power, but it does not make the original BCG bind unreal. The opposite distortion also occurs: some dismiss traditional union as merely physical. Its significance comes from layered vessel synchronization and trust. It is neither mandatory for all expressions of the bond nor spiritually empty when freely chosen.",
    "A dangerous misconception is that permanence excuses harm. It does not. Spiritual continuity does not require continued access, proximity, or tolerance of abuse. The bind's first law remains freedom. Protective boundaries may be necessary to preserve the dignity of both souls. Finally, not every coincidence is an ancient reading. Mature practice records patterns, compares impressions, and remains grounded. Wonder does not need carelessness in order to remain wonder.",
    "Ceremonies, Anniversaries, and Renewal. Although a valid bind does not need repeated creation, Obsidara pairs often renew their awareness of it. Renewal ceremonies remind the Earth mind of what the soul already carries. They can be elaborate or simple. A BCG anniversary may involve replaying the original map, using familiar equipment, repeating the confirmation in updated words, or completing a cooperative objective.",
    "The purpose is not to test whether the bond still exists. It is to add a new record showing how the partners have changed while continuing to choose one another. A private renewal may include conversation, symbolic gifts, reading old records, meditation on BCA vessels, or consensual traditional union. The ceremony should reflect the actual pair rather than imitate someone else's idea of sacredness.",
    "Tablets often serve as archives. Screenshots, messages, art of BCA vessels, shared symbols, and reading journals can be gathered into a covenant record. This record becomes valuable during difficult seasons because it gives the waking mind access to the history held more deeply by the resonance. Some pairs name each year according to what the bind learned: the Year of Returning, the Year of Distance, the Year of the Shield, the Year of Two Voices, the Year of the Open Gate. Naming transforms hardship into integrated history.",
    "Renewal is emotionally powerful because it reveals that permanence is not stagnation. The bind remains, yet its meaning grows. The partners do not repeat the first promise as unchanged people. They stand before it with new scars, new knowledge, and the quiet dignity of having continued.",
    "The Nine Great Benefits. Obsidara teachers often summarize the positive effects of soul binding as nine great benefits. These are not guaranteed rewards delivered without effort. They are capacities made more available through a healthy covenant. The first benefit is recognition: the ability to know the partner beneath changing appearance and circumstance. The second is stabilization: a reliable emotional direction during fear and confusion.",
    "The third benefit is protection: resistance to forces that attempt to erase identity or trust. The fourth is continuity: the preservation of relationship meaning across distance, vessel change, and death. The fifth benefit is shared courage; the pair becomes better able to act without forgetting why survival matters. The sixth is interpretive depth; ancient readings can be compared through two perspectives and held within a denser channel.",
    "The seventh benefit is restorative power; conflict and hardship need not define the final shape of the relationship because the resonance stores pathways of repair. The eighth benefit is vessel truth; both partners become more capable of recognizing and embodying their BCA identities while honoring their present Earth Realm forms. The ninth is expanded purpose; life feels less like an isolated sequence of tasks and more like a shared construction whose meaning can outlast temporary conditions.",
    "These benefits interact. Recognition improves protection. Protection improves stabilization. Stabilization supports courage. Courage enables honest repair. Repair increases resonance density. Density improves readings. Readings deepen vessel truth. Vessel truth strengthens continuity. Continuity gives purpose. The nine benefits form a wheel rather than a ladder. No single benefit is the final prize. The beauty lies in circulation. Care creates strength and strength returns as greater capacity for care.",
    "A Life Course of the Bond. An Obsidara bind changes across the life course. In its early phase, the dominant experience is discovery. The partners learn the sensation of being recognized, establish rituals, and test how the resonance behaves during ordinary pressure. In the building phase, shared history accumulates. BCG sessions, private conversations, traditional union, readings, travel, grief, celebration, and conflict furnish the inner house. The bond becomes less hypothetical because it has survived real events.",
    "In the mastery phase, the pair uses the resonance deliberately. They can enter a difficult conversation without assuming the covenant is ending. They can compare readings without competition. They understand how to restore cooperation. Their BCA vessel recognition becomes clearer. Later life may bring changes in the ER vessels. Strength, appearance, memory, mobility, or health may alter. The bind becomes especially precious because it has never depended solely on temporary form.",
    "If one partner dies first, the life course enters the threshold phase. The surviving Obsidara carries both grief and continuity. The covenant is not treated as a command to remain frozen. Continued living adds honor to the resonance and prepares the surviving soul for eventual BCA vessel reunion. The final phase is described as unveiled recognition. Both souls stand beyond Earth Realm limitation, carrying the complete record of having chosen, built, repaired, and endured. Nothing sincere was wasted.",
    "The Obsidara Lexicon. Bind: the enduring paired resonance established by two consenting Obsidaras. Binding: the act or process of establishing the bind through BCG confirmation, traditional intimate covenant, or both. Third Resonance: the shared spiritual field created by two complete souls; it belongs to the relationship and does not replace either individual.",
    "Recognition Sequence: the stored signature by which each Obsidara identifies the partner beneath changing vessels and appearances. Obsidian Hollow: a poetic name for the protected soul chamber capable of receiving a partner's recognition sequence. First Locking: the moment the bind stabilizes after mutual confirmation. BCG Covenant Path: soul binding established through playing a BattleClanGame together and clearly agreeing to bind.",
    "Traditional Union: private, consensual adult intimacy used to establish or deepen the bond, discussed ceremonially and non-graphically. Resonance Density: the reliability, depth, and carrying capacity of the paired field. Deep Lantern Effect: increased ease of recognizing the partner through dreams, readings, distance, altered vessels, and crisis. ER Vessel: the Earth Realm body and mortal identity through which the soul presently lives.",
    "BCA Vessel: the enduring BattleClanArea form that expresses the soul's truest continuing identity. Vessel Continuity: recognition of the same soul across ER and BCA forms. Ancient Reading: symbolic, emotional, strategic, historical, or spiritual information received through the resonance. Tablet Channel: the use of a modern device as a surface through which meaningful symbolic information may be noticed or delivered.",
    "Covenant Memory: relationship meaning preserved within the paired field beyond ordinary recall. Paired Ascension: the mature development of the bind toward greater clarity, protection, interpretation, repair, and vessel mastery. Holding Seal: an agreed phrase or ritual that preserves security during unavoidable distance or silence. Unveiled Recognition: the afterlife state in which both partners recognize one another through BCA vessels without Earth Realm limitation.",
    "Canonical Articles of Soul Binding. Article One: no Obsidara soul bind is valid without clear, mutual, and freely given consent. Article Two: a BCG session followed by mutual confirmation is sufficient to establish a complete bind between compatible Obsidaras. Article Three: traditional intimate union may establish or deepen the bind when both partners are consenting adults and explicitly intend the covenant.",
    "Article Four: repeated traditional union may add resonance density and power, but no encounter has value when pressured, unsafe, or separated from genuine care. Article Five: the male and female Obsidara remain complete individuals; the bind does not create ownership, mind reading, or unlimited access. Article Six: the third resonance preserves recognition, covenant memory, protection, and continuity without replacing personal responsibility.",
    "Article Seven: the BCA vessel expresses enduring identity, while the ER vessel deserves full honor and care during mortal life. Article Eight: ancient readings may arrive through dreams, symbols, BCG states, conversation, tablets, or other spiritual channels, but they must be interpreted with humility. Article Nine: no reading may cancel consent, justify cruelty, or establish one partner as unquestionable ruler over the other.",
    "Article Ten: the bind is strengthened through honesty, boundaries, shared practice, repair, play, tenderness, and mutual growth. Article Eleven: distance does not automatically weaken the covenant; practical communication and spiritual continuity should support one another. Article Twelve: permanence does not require proximity to harmful behavior; safety and dignity remain sacred.",
    "Article Thirteen: the purpose of Obsidara power is not domination; it is the preservation of identity, relationship, courage, understanding, and meaningful continuation. Article Fourteen: a healthy bind enlarges both lives; neither partner should become smaller in order to prove devotion. Article Fifteen: the final promise of the bind is recognition across transformation; the doorway remembers both names.",
    "Closing Meditation: The Door That Remembers Two Names. There are many ways for two lives to meet. They can collide briefly and leave marks. They can travel beside one another for a season. They can build a household, share victories, endure distance, or speak through glowing tablets while the Earth Realm sleeps around them. Obsidara soul binding gathers these ordinary possibilities and gives them an eternal architecture.",
    "Its wonder begins in simplicity. Two people may sit far apart, enter a BattleClanGame, play one honest match, and speak a clear agreement. No thunder must break the sky. No ancient tower must rise. The soul needs only identity, presence, freedom, and the courage to answer. From that small doorway, an immense house can grow.",
    "Every rescue in battle becomes a beam. Every apology becomes mortar. Every truthful conversation becomes a window. Every consensual traditional union becomes a chamber of deepened recognition. Every reading becomes a lamp whose meaning must be examined together. Every season of distance teaches the walls to hold warmth.",
    "The male Obsidara remains himself. The female Obsidara remains herself. This is not the tragedy of two selves being swallowed. It is the triumph of two selves becoming more visible because each has agreed to remember the other accurately. One day the ER vessels may change beyond recognition. Age may rewrite the face. Circumstance may alter the voice. Death may close the familiar eyes. Yet the bond has been studying something deeper all along.",
    "It has studied the rhythm of choice, the pattern of courage, the way kindness returns after anger, the shape of laughter, the signature of the BCA vessel waiting beneath temporary form. Then comes the final crossing. No scoreboard remains. No tablet battery matters. No distance can pretend to be infinite. Two enduring vessels approach, and the third resonance opens like a house whose lights were never extinguished.",
    "The first soul does not ask, can this stranger prove who they were? The second does not fear that time has erased the path. The recognition sequence completes itself. The covenant memory rises. Every shared game, every quiet promise, every repaired wound, every sacred closeness, every ancient reading, and every ordinary act of choosing becomes present at once. The door opens because it has always remembered two names. And neither soul enters alone.",
    "Appendix A, a simple BCG soul binding ceremony. Both adult partners choose a BCG session and understand beforehand that a soul binding confirmation may occur. They play together as themselves, allowing the game to become a shared field of cooperation, choice, and presence. At a calm moment, one partner clearly asks whether the other freely wishes to establish the Obsidara soul bind. The other partner answers clearly and freely. The first partner confirms that the choice is mutual. They pause, acknowledge the match as the founding record, and discuss how they wish to care for the bond. They may save a date, image, symbol, map, phrase, or record as an Earth Realm anchor.",
    "Appendix B, a non-graphic traditional renewal framework. Confirm that both partners freely desire the private union and the spiritual renewal connected to it. Speak openly about the meaning of the bond and recognize both the ER vessel and the deeper BCA vessel. Enter the private act with tenderness, equality, and complete respect for either partner to slow or stop. Afterward, rest, communicate, and record any meaningful reading or symbol without forcing an interpretation. Treat the resulting power as greater capacity for care, protection, recognition, and truth rather than dominance.",
    "Appendix C, final canon statement. Obsidara soul binding is the chosen architecture by which two adult Obsidaras preserve one another without possession, strengthen one another without erasure, and carry recognition from shared play and sacred closeness into the enduring identity of BattleClanArea.",
    "The practical meaning of the codex asks the pair to convert spiritual language into observable care. The bind is honored when both partners communicate clearly, protect one another from humiliation, preserve private boundaries, and make room for the other to grow. A principle proves its strength among Obsidaras when it produces steadier conduct rather than louder claims. The most respected pairs are not those who speak most often about power, but those whose daily choices reveal patience, courage, reliability, and accurate recognition.",
    "As the principle becomes part of ordinary life, the partners begin to experience the relationship as a durable source of orientation. Major decisions are still made by thinking, discussing, and accepting responsibility, yet the shared field provides a deeper sense of continuity. The pair can ask not only what feels strongest in the moment, but what protects the identities, future, and dignity of both souls. This turns soul binding from a single dramatic event into a lifelong discipline of remembering what the covenant was built to preserve."
  ].join(' ');

  // ---- FRAGMENTER: dedupe + finely split so the whole codex needs 1,000+ meals ----
  var FACTS = null;
  function buildFacts() {
    if (FACTS) return FACTS;
    var text = CODEX.replace(/\s+/g, ' ').trim();
    var raw = text.split(/(?<=[.!?])\s+/);
    var seen = {}, sents = [];
    raw.forEach(function (s) {
      s = s.trim(); if (s.length < 6) return;
      var k = s.toLowerCase().replace(/[^a-z0-9]+/g, '');
      if (!k || seen[k]) return; seen[k] = 1; sents.push(s);
    });
    function chunkAt(w) {
      var out = [], fseen = {};
      sents.forEach(function (s) {
        var words = s.split(' ');
        for (var i = 0; i < words.length; i += w) {
          var c = words.slice(i, i + w).join(' ').trim();
          if (!/[.!?,;:]$/.test(c) && i + w < words.length) c += ' ...';
          var fk = c.toLowerCase().replace(/[^a-z0-9]+/g, '');
          if (!fk || fseen[fk]) continue;
          fseen[fk] = 1; out.push(c);
        }
      });
      return out;
    }
    var w = 13, facts = chunkAt(w);
    // Shrink the fragment size until the codex is split into at least 1,000 unique pieces,
    // so a player must eat OBSIBITES CHICKEN 1,000+ times to read the whole thing.
    while (facts.length < 1000 && w > 3) { w--; facts = chunkAt(w); }
    FACTS = facts;
    return FACTS;
  }

  // ---- FANCY ART: a gilded roast feast on an obsidian platter with a soul-bind aura ----
  function chickenArt() {
    return '<defs>'
      + '<radialGradient id="ob_glow" cx="50%" cy="45%" r="60%"><stop offset="0%" stop-color="#c8a2ff" stop-opacity=".55"/><stop offset="70%" stop-color="#7c3aed" stop-opacity=".12"/><stop offset="100%" stop-color="#7c3aed" stop-opacity="0"/></radialGradient>'
      + '<linearGradient id="ob_meat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#ffdf9e"/><stop offset="45%" stop-color="#e79a34"/><stop offset="100%" stop-color="#8a4a12"/></linearGradient>'
      + '<linearGradient id="ob_plate" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#3a2a5e"/><stop offset="50%" stop-color="#150b28"/><stop offset="100%" stop-color="#050308"/></linearGradient>'
      + '<linearGradient id="ob_gold" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff2c0"/><stop offset="55%" stop-color="#e8b23a"/><stop offset="100%" stop-color="#7a4d09"/></linearGradient>'
      + '</defs>'
      + '<rect x="0" y="0" width="100" height="100" fill="url(#ob_glow)"/>'
      // ornate platter
      + '<ellipse cx="50" cy="78" rx="43" ry="13" fill="url(#ob_plate)" stroke="url(#ob_gold)" stroke-width="1.4"/>'
      + '<ellipse cx="50" cy="76" rx="34" ry="9" fill="none" stroke="#a97bff" stroke-width="0.7" opacity=".6"/>'
      // roast body
      + '<path d="M28,66 C26,48 40,38 50,38 C60,38 74,48 72,66 C66,74 58,76 50,76 C42,76 34,74 28,66 Z" fill="url(#ob_meat)" stroke="#5a3410" stroke-width="1.1"/>'
      + '<path d="M36,52 C42,46 58,46 64,52" fill="none" stroke="#fff3d6" stroke-width="1" opacity=".6"/>'
      + '<ellipse cx="43" cy="58" rx="2.2" ry="1.4" fill="#fff2cf" opacity=".55"/><ellipse cx="57" cy="60" rx="2.6" ry="1.6" fill="#fff2cf" opacity=".4"/>'
      // drumsticks with gold-foil bone tips
      + '<path d="M30,60 C22,58 18,64 22,70 C26,73 33,70 34,64 Z" fill="url(#ob_meat)" stroke="#5a3410" stroke-width="1"/>'
      + '<path d="M70,60 C78,58 82,64 78,70 C74,73 67,70 66,64 Z" fill="url(#ob_meat)" stroke="#5a3410" stroke-width="1"/>'
      + '<rect x="17" y="66" width="7" height="4" rx="2" fill="url(#ob_gold)" transform="rotate(-18 20 68)"/>'
      + '<rect x="76" y="66" width="7" height="4" rx="2" fill="url(#ob_gold)" transform="rotate(18 80 68)"/>'
      // obsidian crown garnish + rising soul sparks
      + '<path d="M44,38 L47,30 L50,36 L53,30 L56,38 Z" fill="url(#ob_gold)" stroke="#5a3a06" stroke-width="0.6"/>'
      + '<g fill="#d9c2ff"><circle cx="34" cy="34" r="1.3"/><circle cx="66" cy="33" r="1.5"/><circle cx="50" cy="22" r="1.6"/><circle cx="40" cy="26" r="1"/><circle cx="60" cy="27" r="1.1"/></g>'
      + '<g stroke="#b98cff" stroke-width="0.7" opacity=".7"><path d="M38,44 C36,40 40,38 39,34"/><path d="M62,44 C64,40 60,38 61,34"/></g>';
  }
  function wrapArt(inner) {
    return '<div class="art-stage rarity-mythic w-full h-32 flex items-center justify-center relative z-10" style="filter:drop-shadow(0 0 24px rgba(168,124,255,.6));">'
      + '<span class="art-corner art-tl"></span><span class="art-corner art-tr"></span><span class="art-corner art-bl"></span><span class="art-corner art-br"></span>'
      + '<span class="rarity-tag">OBSIDARA FEAST</span>'
      + '<svg viewBox="0 0 100 100" class="w-24 h-24 drop-shadow-2xl art-float">' + inner + '</svg></div>';
  }

  function foodDef() {
    return {
      id: FOOD_ID, name: 'OBSIBITES CHICKEN', sub: 'Obsidara Feast', tier: 14,
      req: 'Obsidara Codex Clearance', price: 450000,
      // No combat buff: this is a lore feast. Each meal unlocks one unique Codex fragment.
      buffDesc: '<span class="text-purple-300">Each meal reveals ONE unique fragment of the Obsidara Soul Binding Codex.</span><br><span class="text-gray-400 text-[9px] normal-case tracking-normal">A gilded roast served on an obsidian platter. Fragments are handed out in order and never repeat - read the whole codex by feasting 1,000+ times. Every fragment you unlock is stored in your INTEL FILES to re-read forever.</span>',
      desc: 'A gilded Obsidara feast that feeds the soul more than the body.',
      obsibites: true
    };
  }

  function boot() {
    var S = window.BCA_SYS;
    if (!S || !S.shop || !S.food || !S.state) return setTimeout(boot, 400);
    if (S._obsibitesInstalled) return; S._obsibitesInstalled = true;

    buildFacts();
    try { S.food.obsibitesFacts = FACTS; } catch (e) {} // exposed for tests/tools

    // ----- register the food into shop.db.food (+ re-inject after generateDB) -----
    function inject() {
      var db = S.shop.db; if (!db || !db.food) return;
      if (!db.food.some(function (f) { return f && f.id === FOOD_ID; })) db.food.unshift(foodDef());
    }
    inject();
    if (S.shop.generateDB && !S.shop.generateDB._obsibites) {
      var g = S.shop.generateDB.bind(S.shop);
      S.shop.generateDB = function () { var r = g.apply(this, arguments); try { inject(); } catch (e) {} return r; };
      S.shop.generateDB._obsibites = true;
    }

    // ----- fancy art (registered into legendaryArt so EVERY art path resolves it) -----
    S.shop.legendaryArt = S.shop.legendaryArt || {};
    S.shop.legendaryArt[FOOD_ID] = function () { return wrapArt(chickenArt()); };
    try { if (S.shop.artCache) Object.keys(S.shop.artCache).forEach(function (k) { if (k.indexOf(FOOD_ID) !== -1) delete S.shop.artCache[k]; }); } catch (e) {}

    // ----- the reveal: hand out the next unique fragment, store progress like intel files -----
    function reveal(item) {
      var p = S.state.profile; if (!p) return true;
      var facts = buildFacts();
      p.obsidaraProgress = Math.max(0, p.obsidaraProgress || 0);
      var total = facts.length;
      if (p.obsidaraProgress >= total) {
        showFragment(total - 1, false, total, true);
        try { S.ui.notify('You have already absorbed the ENTIRE Obsidara Codex (' + total + ' fragments).'); } catch (e) {}
        return true;
      }
      var idx = p.obsidaraProgress;         // next unseen fragment (strictly sequential = never repeats)
      p.obsidaraProgress = idx + 1;
      try { S.storage.lastSavedDataStr = ''; S.storage.save(true); } catch (e) {}
      // stored like an intel recovery so it lands in the command/intel logs too
      try { S.utils.logEvent('[INTEL RECOVERY] ' + p.id + ' consumed OBSIBITES CHICKEN and absorbed Obsidara Codex fragment ' + (idx + 1) + ' of ' + total + '.'); } catch (e) {}
      showFragment(idx, true, total, false);
      return true;
    }

    // wrap consume so OBSIBITES routes to reveal(); keep it outermost against later re-wraps
    function installConsume() {
      if (!S.food || !S.food.consume || S.food.consume._obsibites) return;
      var orig = S.food.consume.bind(S.food);
      S.food.consume = function (item) {
        if (item && (item.id === FOOD_ID || item.obsibites)) { try { return reveal(item); } catch (e) {} }
        return orig(item);
      };
      S.food.consume._obsibites = true;
    }
    installConsume();
    setInterval(installConsume, 3000); // stay outermost if another patch re-wraps consume

    // ----- fragment modal: the CODEX INFORMATION shown ABOVE the food info pool -----
    function ensureModal() {
      var m = document.getElementById('obsibites-modal');
      if (m) return m;
      m = document.createElement('div');
      m.id = 'obsibites-modal';
      m.className = 'hidden fixed inset-0 z-[650] items-center justify-center p-4';
      m.style.cssText += 'background:rgba(4,2,10,0.92);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);';
      m.innerHTML =
        '<div class="panel-lux p-6 md:p-8 border-2 border-purple-600 max-w-2xl w-full relative overflow-hidden shadow-[0_0_60px_rgba(150,90,255,0.35)] max-h-[88vh] flex flex-col" style="background:linear-gradient(160deg,#140a26,#08050f);">'
        + '<div id="obsi-new" class="text-purple-300 text-[10px] font-black uppercase tracking-[0.4em] text-center mb-2 animate-pulse">\u2726 OBSIDARA CODEX FRAGMENT ABSORBED \u2726</div>'
        + '<h2 class="cinzel text-xl md:text-2xl text-purple-300 text-center mb-1">THE OBSIDARA SOUL BINDING CODEX</h2>'
        + '<div id="obsi-prog" class="text-[10px] text-center text-[#e5b814] font-black uppercase tracking-[0.3em] mb-3"></div>'
        // THE INFORMATION (above the food info pool)
        + '<div class="text-[12px] md:text-base text-purple-100 leading-relaxed overflow-y-auto scrollbar-hide flex-1 bg-[#0c0718] border border-purple-900 p-4 rounded" style="min-height:90px;">'
        + '<div class="text-[9px] text-purple-500 uppercase tracking-widest mb-2 font-bold">CODEX FRAGMENT</div>'
        + '<p id="obsi-body" style="font-style:italic;"></p></div>'
        // the small food info pool BELOW the information
        + '<div class="mt-3 pt-3 border-t border-[#2a2140] text-[9px] text-gray-500 uppercase tracking-widest text-center">OBSIBITES CHICKEN \u00B7 450,000 \u00B7 Obsidara Feast \u2014 eat again for the next fragment</div>'
        + '<button class="btn-military py-3 w-full text-sm mt-4" onclick="document.getElementById(\'obsibites-modal\').classList.remove(\'flex\');document.getElementById(\'obsibites-modal\').classList.add(\'hidden\');">SEAL FRAGMENT</button>'
        + '</div>';
      document.body.appendChild(m);
      return m;
    }
    function showFragment(idx, isNew, total, done) {
      var facts = buildFacts();
      var m = ensureModal();
      m.querySelector('#obsi-new').style.display = isNew ? 'block' : 'none';
      m.querySelector('#obsi-prog').innerText = done
        ? ('CODEX COMPLETE \u00B7 ' + total + ' / ' + total + ' FRAGMENTS')
        : ('FRAGMENT ' + (idx + 1) + ' OF ' + total + '  \u00B7  ' + (idx + 1) + ' / ' + total + ' ABSORBED');
      m.querySelector('#obsi-body').innerText = facts[idx] || '';
      m.classList.remove('hidden'); m.classList.add('flex');
    }

    // ----- INTEL FILES archive: an Obsidara Codex section ABOVE the regular intel pool -----
    if (S.food.openArchive && !S.food.openArchive._obsibites) {
      var origArch = S.food.openArchive.bind(S.food);
      S.food.openArchive = function () {
        origArch();
        try { renderCodexArchive(); } catch (e) {}
      };
      S.food.openArchive._obsibites = true;
    }
    // expose re-read + read-all for the archive UI
    S.food.showObsidara = function (idx) { showFragment(idx, false, buildFacts().length, false); };
    function renderCodexArchive() {
      var list = document.getElementById('intel-file-list'); if (!list) return;
      var p = S.state.profile || {}; var facts = buildFacts();
      var prog = Math.max(0, Math.min(facts.length, p.obsidaraProgress || 0));
      var old = document.getElementById('obsi-codex-archive'); if (old) old.parentNode.removeChild(old);
      var box = document.createElement('div');
      box.id = 'obsi-codex-archive';
      box.className = 'panel-lux p-4 mb-4 border-2 border-purple-700';
      box.style.cssText = 'background:linear-gradient(160deg,#140a26,#0a0714);';
      var rows = '';
      if (!prog) {
        rows = '<div class="text-gray-500 text-center p-3 uppercase tracking-widest text-[10px] font-bold">NO CODEX FRAGMENTS YET. EAT OBSIBITES CHICKEN (450,000) TO ABSORB THE OBSIDARA SOUL BINDING CODEX ONE FRAGMENT AT A TIME.</div>';
      } else {
        var items = [];
        for (var i = prog - 1; i >= 0; i--) {
          items.push('<div class="flex items-start gap-2 px-2 py-2 border-b border-[#241a3a] cursor-pointer hover:bg-[#1a1030]" onclick="BCA_SYS.food.showObsidara(' + i + ')">'
            + '<span class="text-purple-400 font-black text-[10px] w-12 shrink-0">#' + (i + 1) + '</span>'
            + '<span class="text-purple-100 text-[11px] leading-snug" style="font-style:italic;">' + esc(facts[i]) + '</span></div>');
        }
        rows = '<div class="max-h-[320px] overflow-y-auto scrollbar-hide">' + items.join('') + '</div>';
      }
      box.innerHTML = '<div class="cinzel text-lg text-purple-300 text-center">THE OBSIDARA SOUL BINDING CODEX</div>'
        + '<div class="text-[10px] text-center text-[#e5b814] font-black uppercase tracking-[0.3em] mt-1 mb-3">' + prog + ' / ' + facts.length + ' FRAGMENTS ABSORBED</div>'
        + rows;
      // ABOVE the regular intel pool, for these foods only
      list.parentNode.insertBefore(box, list);
    }
    function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }

    // ----- ROYAL TOWN · THE GILDED SPIT: sell OBSIBITES CHICKEN on the fine-dining menu -----
    // The feast now lives where players expect food in Royal Town. Dining on it in The Gilded
    // Spit charges its price and reveals the next unique Obsidara Codex fragment (no combat
    // buff / random blessing), exactly like eating it anywhere else.
    // ONE shared menu entry object (referenced by both TWN.menu and TWN.foodIndex).
    var GILD_ENTRY = null;
    function gildEntry() {
      if (GILD_ENTRY) return GILD_ENTRY;
      var e = {
        kind: 'food', id: FOOD_ID, name: 'OBSIBITES CHICKEN', sub: 'Obsidara Feast',
        tier: 14, obsibites: true,
        // The Gilded Spit render + serve paths read f.buff.desc; give a safe, descriptive buff.
        buff: { t: 'flat', val: 0, desc: 'REVEALS 1 UNIQUE OBSIDARA CODEX FRAGMENT' }
      };
      // Pin the price at the feast's canonical 450,000 (matches the codex modal + foodDef).
      // Royal Town runs several menu re-pricing passes that overwrite any food's `price`;
      // an immutable getter makes each of their writes a silent no-op, so the displayed and
      // charged price stay identical and consistent everywhere.
      try {
        Object.defineProperty(e, 'price', { get: function () { return 450000; }, set: function () {}, enumerable: true, configurable: true });
      } catch (ex) { e.price = 450000; }
      GILD_ENTRY = e; return e;
    }
    function installGildedSpit() {
      var T = S.travel, TWN = T && T.town;
      if (!TWN || !TWN.menu) return false;
      // Add to The Gilded Spit menu once, pinned near the top so it is easy to find.
      if (!TWN.menu.some(function (f) { return f && f.id === FOOD_ID; })) TWN.menu.unshift(gildEntry());
      TWN.foodIndex = TWN.foodIndex || {};
      TWN.foodIndex[FOOD_ID] = gildEntry();
      // Route dining on the feast to the codex reveal (charge gold, eat-now, no buff/blessing).
      if (TWN.buyFood && !TWN.buyFood._obsibites) {
        var ob = TWN.buyFood.bind(TWN);
        TWN.buyFood = function (id, fromRestaurant) {
          if (id === FOOD_ID) {
            var src = TWN.foodIndex[FOOD_ID] || gildEntry();
            var p = S.state.profile; if (!p) return;
            if ((p.gold || 0) < src.price) { try { S.ui.notify('INSUFFICIENT GOLD.'); } catch (e) {} return; }
            p.gold -= src.price; try { S.ui.updateHeader(); } catch (e) {}
            try { S.ui.notify('THE GILDED SPIT IS PREPARING OBSIBITES CHICKEN...'); } catch (e) {}
            setTimeout(function () {
              try { reveal(src); } catch (e) {}
              try { S.utils.logEvent('[RATIONS] ' + p.id + ' dined on OBSIBITES CHICKEN at The Gilded Spit.'); } catch (e) {}
              try { S.storage.lastSavedDataStr = ''; S.ui.updateHeader(); S.storage.save(); } catch (e) {}
            }, 1500);
            return;
          }
          return ob(id, fromRestaurant);
        };
        TWN.buyFood._obsibites = true;
      }
      return true;
    }
    installGildedSpit();
    // Re-assert against the town module / later re-wraps loading after us (idempotent, no stacking).
    [800, 2000, 4000, 8000, 14000].forEach(function (t) { setTimeout(installGildedSpit, t); });
    setInterval(installGildedSpit, 6000);

    try { console.log('[OBSIBITES] ready -', buildFacts().length, 'codex fragments'); } catch (e) {}
  }
  boot();
})();
