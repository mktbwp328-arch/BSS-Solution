/**
 * BSS SOLUTION - Bilingual (TH/EN) switcher
 *
 * Thai text in the HTML files stays the single source of truth. This script
 * swaps visible text nodes to English on demand and restores the original Thai
 * on the way back, so the saved HTML files are never touched by translation.
 */
(function () {
    'use strict';

    var STORAGE_KEY = 'bss_lang';

    // Areas the translator must never touch (admin editor chrome, its own button)
    var SKIP_SELECTOR = '#bss-editor-ui, #bss-admin-bar, #bss-element-settings, #bss-lang-switch';

    var TITLES = {
        'รับทำสายพานลำเลียง ออกแบบ-ติดตั้ง Conveyor System | BSS SOLUTION (1978)':
            'Conveyor Belt Manufacturing, Design & Installation | BSS SOLUTION (1978)',
        'เกี่ยวกับเรา | บริษัททำสายพานลำเลียง ตั้งแต่ปี 2521 | BSS SOLUTION (1978)':
            'About Us | Conveyor Manufacturer Since 1978 | BSS SOLUTION (1978)',
        'BSS SOLUTION (1978) - ผู้นำด้านระบบสายพานลำเลียงและเครื่องจักรกลอุตสาหกรรม':
            'BSS SOLUTION (1978) - Leading Conveyor Systems & Industrial Machinery',
        'เกี่ยวกับเรา | BSS SOLUTION (1978)':
            'About Us | BSS SOLUTION (1978)',
        'บทความและสาระน่ารู้ด้านระบบลำเลียงอุตสาหกรรม | BSS SOLUTION (1978)':
            'Articles & Insights on Industrial Conveyor Systems | BSS SOLUTION (1978)',
        'ติดต่อเรา | บริษัทรับทำสายพานลำเลียง สมุทรปราการ | BSS SOLUTION (1978)':
            'Contact Us | Conveyor Manufacturer in Samut Prakan | BSS SOLUTION (1978)',
        'รับออกแบบติดตั้งระบบสายพานลำเลียง Conveyor สมุทรปราการ | BSS SOLUTION (1978)':
            'Conveyor System Design & Installation, Samut Prakan | BSS SOLUTION (1978)'
    };

    var DICT = {
        /* ---------- Navigation ---------- */
        'หน้าแรก': 'Home',
        'เกี่ยวกับเรา': 'About Us',
        'บริการของเรา': 'Our Services',
        'ผลงาน': 'Projects',
        'ลูกค้าของเรา': 'Our Clients',
        'บทความ': 'Articles',
        'ติดต่อเรา': 'Contact Us',

        /* ---------- Home: hero ---------- */
        'นวัตกรรม': 'Innovative',
        'สายพานลำเลียง': 'Conveyor Systems',
        'เพื่ออุตสาหกรรมสมัยใหม่': 'for Modern Industry',
        'เราคือผู้เชี่ยวชาญด้านการออกแบบ ผลิต และติดตั้งระบบสายพานลำเลียงทุกรูปแบบ (Turn-key Projects) ด้วยประสบการณ์ที่ยาวนานและเทคโนโลยีที่ทันสมัย':
            'We are specialists in the design, manufacture and installation of every type of conveyor system (turn-key projects), backed by decades of experience and modern technology.',
        'ดูบริการของเรา': 'View Our Services',
        'ปรึกษาเราฟรี': 'Free Consultation',
        'ชมวิดีโอแนะนำ': 'Watch Intro Video',

        /* ---------- Home: about ---------- */
        'บริษัท บีเอสเอส โซลูชั่น (1978) จำกัด': 'BSS Solution (1978) Co., Ltd.',
        'BSS SOLUTION (1978) คือบริษัททำสายพานลำเลียงที่มีโรงงานผลิตเป็นของตัวเองในจังหวัดสมุทรปราการ ให้บริการครบวงจรทั้งออกแบบ Conveyor รับทำ Conveyor และติดตั้ง Conveyor เพื่อเพิ่มประสิทธิภาพในกระบวนการผลิตและลดต้นทุนแรงงาน':
            'BSS SOLUTION (1978) is a conveyor manufacturer with its own plant in Samut Prakan, offering a complete service — conveyor design, manufacture and installation — that raises production efficiency and cuts labour costs.',
        'ด้วยทีมวิศวกรและช่างผู้ชำนาญการ เราพร้อมให้บริการตั้งแต่วางแผน (Consulting), ออกแบบ (Design), ติดตั้ง (Installation) ไปจนถึงการซ่อมบำรุง (Maintenance) รองรับทั้งสายพานลำเลียง PVC และสายพานลำเลียง PU สำหรับโรงงานทุกประเภท':
            'With skilled engineers and technicians, we cover consulting, design, installation and maintenance, supporting both PVC and PU conveyor belts for factories of every kind.',

        /* ---------- Home: services ---------- */
        'ออกแบบและติดตั้งสายพานลำเลียงทุกประเภท เช่น Belt, Roller, Chain, Slat และ Modular Conveyors':
            'Design and installation of all conveyor types — belt, roller, chain, slat and modular conveyors.',
        'ระบบคัดแยกขยะและรีไซเคิลอัตโนมัติ เพื่อการจัดการสิ่งแวดล้อมอย่างยั่งยืน':
            'Automated waste sorting and recycling systems for sustainable environmental management.',
        'บริการตรวจเช็ค ซ่อมบำรุง และเปลี่ยนอะไหล่เครื่องจักรกลอุตสาหกรรม (Factory Shutdown Service)':
            'Inspection, maintenance and spare-part replacement for industrial machinery (factory shutdown service).',
        'บริการรับเหมาติดตั้งเครื่องจักรและระบบโรงงานครบวงจร ตั้งแต่ต้นจนจบ':
            'End-to-end contracting for machinery and complete factory systems, from start to finish.',

        /* ---------- Home: service cards (SEO-oriented headings) ---------- */
        'รับทำระบบสายพานลำเลียง (Conveyor System)': 'Conveyor Systems',
        'รับออกแบบ ผลิต และติดตั้งสายพานลำเลียงทุกประเภท ทั้ง Belt, Roller Conveyor, ลูกกลิ้งลำเลียง, Chain, Slat, Modular และสายพานลำเลียง PVC / PU':
            'Design, manufacture and installation of every conveyor type — belt, roller, chain, slat, modular, and PVC / PU conveyor belts.',
        'ระบบคัดแยกและรีไซเคิล (Recycling Equipment)': 'Recycling Equipment',
        'ระบบคัดแยกขยะและรีไซเคิลอัตโนมัติ พร้อมสายพานลำเลียงและโซ่ลำเลียงที่ทนแรงกระแทก เพื่อการจัดการสิ่งแวดล้อมอย่างยั่งยืน':
            'Automated waste sorting and recycling systems with impact-resistant belt and chain conveyors, for sustainable environmental management.',
        'ซ่อมบำรุงและงาน Shutdown โรงงาน': 'Maintenance & Factory Shutdown',
        'บริการตรวจเช็ค ซ่อมบำรุง ตั้งศูนย์สายพาน และเปลี่ยนอะไหล่เครื่องจักรกลอุตสาหกรรม รองรับงาน Shutdown โรงงานตามกรอบเวลาที่กำหนด':
            'Inspection, maintenance, belt tracking and spare-part replacement for industrial machinery — shutdown work delivered inside your scheduled window.',
        'ระบบลำเลียงอัตโนมัติ & Turn-key': 'Automated Systems & Turn-key',
        'รับเหมาติดตั้งระบบลำเลียงอัตโนมัติและเครื่องจักรโรงงานครบวงจร ตั้งแต่ออกแบบ ผลิต ติดตั้ง จนทดสอบเดินระบบส่งมอบ':
            'Full contracting for automated conveying and factory machinery — design, manufacture, installation and commissioning through to handover.',

        /* ---------- Home: gallery captions (folder file names) ---------- */
        'งาน shutdown โรงงาน': 'Factory Shutdown Work',
        'บริษัท รับทำ conveyor ชลบุรี': 'Conveyor Manufacturer, Chonburi',
        'บริษัทรับติดตั้งเครื่องจักร': 'Machinery Installation Company',
        'บริษัทออกแบบสายพานลำเลียง': 'Conveyor Design Company',
        'Roller Conveyor ลูกกลิ้ง': 'Roller Conveyor',
        'ระบบลำเลียงแบบลูกกลิ้ง (Roller Conveyor)': 'Roller Conveyor System',
        'สายพานลำเลียง conveyor belt': 'Conveyor Belt',
        'ออกแบบลูกกลิ้งลำเลียง': 'Roller Conveyor Design',

        /* ---------- Home: gallery / clients ---------- */
        'ผลงานของเรา': 'Our Work',
        'ลูกค้าที่ไว้วางใจเรา': 'Clients Who Trust Us',
        'สายพานลำเลียงอุตสาหกรรมอาหาร (Food Industry)': 'Food Industry Conveyor',
        'ระบบคัดแยกขยะรีไซเคิล (Recycling Sorting)': 'Recycling Sorting System',
        'ไลน์ลูกกลิ้งลำเลียง (Roller Conveyor)': 'Roller Conveyor Line',
        'ระบบลำเลียงอัตโนมัติ (Automated Line)': 'Automated Conveying Line',
        'โรงงานผลิตสายพานลำเลียง': 'Conveyor Belt Factory',
        'สายพานลำเลียง Conveyor Belt': 'Conveyor Belt',
        'สายพานลำเลียงอุตสาหกรรม': 'Industrial Conveyor Belt',
        'ไลน์สายพานลำเลียง': 'Conveyor Belt Line',
        'ระบบสายพานลำเลียง (Conveyor)': 'Conveyor System',
        'ระบบลำเลียงในสายการผลิต': 'Production Line Conveying',
        'สายพานลำเลียง PVC (PVC Belt Conveyor)': 'PVC Belt Conveyor',
        'ระบบสายพานลำเลียงแบบ PVC': 'PVC Conveyor Belt System',
        'ลูกกลิ้งลำเลียง (Roller Conveyor)': 'Roller Conveyor',
        'ระบบลำเลียงแบบลูกกลิ้ง': 'Roller Conveyor System',
        'ออกแบบลูกกลิ้งลำเลียง': 'Roller Conveyor Design',
        'โซ่ลำเลียง (Chain Conveyor)': 'Chain Conveyor',
        'ระบบลำเลียงแบบโซ่ Chain Conveyor': 'Chain Conveyor System',
        'สกรูลำเลียง (Screw Conveyor)': 'Screw Conveyor',
        'ระบบลำเลียง Recycle Equipment': 'Recycling Conveyor Equipment',
        'บริการติดตั้งสายพานลำเลียง': 'Conveyor Installation Service',
        'รับติดตั้งเครื่องจักรโรงงาน': 'Factory Machinery Installation',
        'รับทำ Conveyor ชลบุรี': 'Conveyor Manufacturing, Chonburi',

        /* ---------- Home: articles teaser ---------- */
        'บทความและสาระน่ารู้': 'Articles & Insights',
        'เทคโนโลยีระบบลำเลียงอัตโนมัติ 4.0 เพิ่มประสิทธิภาพโรงงานได้อย่างไร?':
            'How Industry 4.0 Automated Conveyor Technology Boosts Factory Efficiency',
        'เจาะลึกการนำระบบ Smart Conveyor เข้ามาช่วยในกระบวนการผลิตเพื่อลดความผิดพลาดและเพิ่มความเร็ว...':
            'A close look at bringing smart conveyor systems into production to reduce errors and increase speed...',
        'การเลือกสายพานลำเลียงให้เหมาะกับงานคัดแยกขยะรีไซเคิล':
            'Choosing the Right Conveyor Belt for Recycling and Waste Sorting',
        'ทำไมระบบสายพานจึงสำคัญต่อการคัดแยกขยะ และควรเลือกใช้วัสดุสายพานแบบไหนถึงจะทนทานที่สุด...':
            'Why conveyor systems matter in waste sorting, and which belt materials last the longest...',
        '5 ข้อควรระวังในการซ่อมบำรุงระบบสายพานช่วง Factory Shutdown':
            '5 Precautions for Conveyor Maintenance During a Factory Shutdown',
        'เตรียมตัวให้พร้อมก่อนช่วงหยุดซ่อมบำรุงใหญ่ เพื่อให้เครื่องจักรทำงานได้อย่างต่อเนื่องไม่มีสะดุด...':
            'Get ready before the major maintenance window so your machinery runs without interruption...',
        'อ่านต่อ': 'Read more',
        'ดูบทความทั้งหมด': 'View All Articles',

        /* ---------- Home: CTA & contact ---------- */
        'ต้องการเพิ่มประสิทธิภาพให้โรงงานของคุณ?': 'Ready to make your factory more efficient?',
        'ติดต่อเราวันนี้เพื่อรับคำปรึกษาจากวิศวกรผู้เชี่ยวชาญ':
            'Contact us today for advice from our specialist engineers.',
        'แอดไลน์ปรึกษาทันที': 'Chat with us on LINE',
        'ที่อยู่': 'Address',
        '328 หมู่ที่ 6 ตำบลคลองนิยมยาตรา': '328 Moo 6, Khlong Niyom Yatra Subdistrict,',
        'อำเภอบางบ่อ สมุทรปราการ 10560': 'Bang Bo District, Samut Prakan 10560, Thailand',
        'เปิดดูแผนที่ (Google Maps)': 'Open in Google Maps',
        'เบอร์โทรศัพท์': 'Phone',
        'อีเมล': 'Email',
        'ส่งข้อความ': 'Send Message',
        'สแกนเพื่อเพิ่มเพื่อนใน LINE': 'Scan to add us on LINE',
        'แอดไลน์ (Add Friend)': 'Add Friend on LINE',
        'แผนที่บริษัท BSS SOLUTION (1978)': 'BSS SOLUTION (1978) location map',
        'เปิดในแอป Google Maps (นำทาง)': 'Open in Google Maps (directions)',

        /* ---------- Home: FAQ ---------- */
        'คำถามที่พบบ่อย': 'Frequently Asked Questions',
        'รวมคำถามที่ลูกค้าถามเราบ่อยที่สุด เกี่ยวกับการรับทำสายพานลำเลียง การออกแบบ ติดตั้ง และงาน Shutdown โรงงาน':
            'The questions customers ask us most often — about conveyor manufacturing, design, installation and factory shutdown work.',

        'BSS SOLUTION (1978) รับทำสายพานลำเลียงแบบไหนบ้าง?':
            'What types of conveyor does BSS SOLUTION (1978) build?',
        'เรารับทำสายพานลำเลียงครบทุกประเภท ได้แก่ สายพานลำเลียง PVC, สายพานลำเลียง PU สำหรับงานสัมผัสอาหาร, Roller Conveyor และลูกกลิ้งลำเลียง, โซ่ลำเลียง (Chain Conveyor), Slat และ Modular Conveyor, สกรูลำเลียงสแตนเลส รวมถึงระบบลำเลียงอัตโนมัติที่ควบคุมด้วยเซ็นเซอร์และอินเวอร์เตอร์ โดยให้บริการตั้งแต่ออกแบบ ผลิต ไปจนถึงติดตั้งและซ่อมบำรุง':
            'We build every conveyor type: PVC belts, PU belts for food-contact work, roller conveyors, chain conveyors, slat and modular conveyors, stainless steel screw conveyors, and automated conveying controlled by sensors and inverters — covering design, manufacture, installation and maintenance.',

        'รับออกแบบสายพานลำเลียงตามพื้นที่โรงงานได้ไหม?':
            'Can you design a conveyor to fit our factory floor?',
        'ได้ครับ ทีมวิศวกรของเรารับออกแบบสายพานลำเลียงเฉพาะงาน โดยสำรวจหน้างานจริงแล้วคำนวณน้ำหนักบรรทุก ความเร็วสายพาน ระยะ Pitch ของลูกกลิ้ง กำลังมอเตอร์ และผังการเดินระบบ ให้พอดีกับพื้นที่โรงงาน ชนิดสินค้าที่ลำเลียง และสภาพแวดล้อม เช่น ความชื้น อุณหภูมิสูง หรือการสัมผัสสารเคมี':
            'Yes. Our engineers design custom conveyors: we survey the site, then calculate load, belt speed, roller pitch, motor power and the system layout to suit your floor space, the goods being moved, and the environment — humidity, high temperature or chemical exposure.',

        'สายพานลำเลียง PVC กับ PU ต่างกันอย่างไร ควรเลือกแบบไหน?':
            'What is the difference between PVC and PU conveyor belts?',
        'สายพานลำเลียง PVC ทนกรด สารเคมี และน้ำมันได้ดี ราคาประหยัด เหมาะกับงานลำเลียงสินค้าทั่วไป กล่องพัสดุ และงานคัดแยกขยะรีไซเคิล ส่วนสายพานลำเลียง PU มีผิวเรียบ ทำความสะอาดง่าย ไม่เป็นแหล่งสะสมเชื้อ จึงเหมาะกับอุตสาหกรรมอาหารและยาที่สายพานสัมผัสผลิตภัณฑ์โดยตรง':
            'PVC belts resist acids, chemicals and oils, cost less, and suit general goods handling, cartons and recycling sorting. PU belts have a smooth, easy-to-clean surface that does not harbour bacteria, making them right for food and pharmaceutical lines where the belt touches the product directly.',

        'รับงาน Shutdown โรงงาน ช่วงหยุดสายการผลิตหรือไม่?':
            'Do you take on factory shutdown work?',
        'รับครับ เรามีทีมช่างเฉพาะทางสำหรับงาน Shutdown โรงงาน ทั้งการตรวจเช็คระบบสายพานลำเลียง ตั้งศูนย์สายพาน เชื่อมต่อสายพาน เปลี่ยนลูกกลิ้งและอะไหล่ที่สึกหรอ ไปจนถึงติดตั้งไลน์ใหม่ โดยวางแผนงานให้เสร็จภายในกรอบเวลาที่โรงงานหยุดผลิต เพื่อให้กลับมาเดินเครื่องได้ตรงกำหนด':
            'Yes. We have a dedicated shutdown crew for conveyor inspection, belt tracking and splicing, roller and worn-part replacement, and new line installation — all planned to finish inside your production stoppage so you restart on schedule.',

        'บริษัทรับติดตั้งสายพานลำเลียงในพื้นที่ไหนบ้าง?':
            'Which areas do you install conveyors in?',
        'โรงงานของเราตั้งอยู่ที่อำเภอบางบ่อ จังหวัดสมุทรปราการ จึงรับติดตั้งสายพานลำเลียงในสมุทรปราการและกรุงเทพฯ ได้อย่างรวดเร็ว และยังให้บริการครอบคลุมพื้นที่ภาคตะวันออก เช่น ชลบุรี ระยอง ฉะเชิงเทรา รวมถึงรับงานทั่วประเทศไทย':
            'Our plant is in Bang Bo District, Samut Prakan, so we install quickly across Samut Prakan and Bangkok. We also cover the eastern region — Chonburi, Rayong, Chachoengsao — and take projects throughout Thailand.',

        'ระบบลำเลียงอัตโนมัติช่วยลดต้นทุนโรงงานได้อย่างไร?':
            'How does an automated conveying system cut factory costs?',
        'ระบบลำเลียงอัตโนมัติช่วยลดจำนวนแรงงานที่ต้องยกและเคลื่อนย้ายสินค้า ลดความผิดพลาดจากการทำงานด้วยมือ และทำให้รอบการผลิตคงที่คาดการณ์ได้ เมื่อใช้ร่วมกับมอเตอร์อินเวอร์เตอร์ยังช่วยลดค่าไฟ และการวางแผนบำรุงรักษาเชิงป้องกันยังลดการหยุดสายการผลิตแบบกะทันหันซึ่งมีต้นทุนสูงที่สุด':
            'It cuts the labour needed to lift and move goods, removes manual handling errors, and makes cycle times steady and predictable. Paired with inverter-driven motors it lowers electricity use, and preventive maintenance planning reduces the unplanned stoppages that cost the most.',

        'ขอใบเสนอราคาสายพานลำเลียงต้องเตรียมข้อมูลอะไรบ้าง?':
            'What information do you need to quote a conveyor?',
        'เตรียมข้อมูล 5 อย่างจะประเมินราคาได้เร็วที่สุด คือ 1) ชนิดและน้ำหนักของสิ่งที่ต้องการลำเลียง 2) ความกว้างและความยาวของไลน์ที่ต้องการ 3) ความสูงและระยะยกหรือความลาดเอียง 4) กำลังการผลิตต่อชั่วโมง 5) สภาพแวดล้อมหน้างาน เช่น ความชื้น อุณหภูมิ หรือสารเคมี หากมีแบบแปลนหรือรูปถ่ายหน้างานส่งมาด้วยจะช่วยให้ประเมินได้แม่นยำขึ้น':
            'Five details get you the fastest quote: 1) the type and weight of what you are moving, 2) the width and length of line you need, 3) the height, lift or incline, 4) throughput per hour, and 5) site conditions such as humidity, temperature or chemicals. A drawing or site photos make the estimate more accurate.',

        'BSS SOLUTION มีประสบการณ์มานานเท่าไหร่?':
            'How long has BSS SOLUTION been in business?',
        'บริษัท บีเอสเอส โซลูชั่น (1978) จำกัด ก่อตั้งตั้งแต่ปี พ.ศ. 2521 มีประสบการณ์ด้านระบบสายพานลำเลียงและเครื่องจักรกลอุตสาหกรรมมากว่า 4 ทศวรรษ ส่งมอบงานมาแล้วกว่า 500 โปรเจกต์ ให้กับโรงงานชั้นนำในอุตสาหกรรมอาหาร เครื่องดื่ม ยานยนต์ รีไซเคิล และโลจิสติกส์':
            'BSS Solution (1978) Co., Ltd. was founded in 1978, giving us more than four decades in conveyor systems and industrial machinery. We have delivered over 500 projects to leading factories in food, beverage, automotive, recycling and logistics.',

        /* ---------- Contact page ---------- */
        'ติดต่อ': 'Contact',
        'ทีมวิศวกรของเรา': 'Our Engineering Team',
        'ปรึกษาเรื่องระบบสายพานลำเลียง ขอใบเสนอราคา หรือแจ้งปัญหาไลน์การผลิตเดิม ทีมงานพร้อมตอบกลับอย่างรวดเร็ว':
            'Ask about a conveyor system, request a quotation, or tell us about a problem on an existing line — our team replies quickly.',
        'โทรหาเรา': 'Call us',
        'แชทผ่าน LINE': 'Chat on LINE',
        'ส่งอีเมล': 'Email us',

        /* ---------- Shared footer ---------- */
        'บริษัท บีเอสเอส โซลูชั่น (1978) จำกัด รับออกแบบ ผลิต และติดตั้งระบบสายพานลำเลียงและเครื่องจักรกลอุตสาหกรรมครบวงจร ตั้งแต่ปี พ.ศ. 2521':
            'BSS Solution (1978) Co., Ltd. — complete design, manufacture and installation of conveyor systems and industrial machinery since 1978.',
        'เมนูหลัก': 'Main Menu',
        'บริษัท Conveyor สมุทรปราการ — ให้บริการสายพานลำเลียง สมุทรปราการ กรุงเทพฯ ฉะเชิงเทรา ชลบุรี ระยอง และปราจีนบุรี':
            'Conveyor company in Samut Prakan — serving Samut Prakan, Bangkok, Chachoengsao, Chonburi, Rayong and Prachinburi.',
        'ผลงานของเรา': 'Our Work',
        'ลูกกลิ้งลำเลียง Roller Conveyor': 'Roller Conveyor',
        'โซ่ลำเลียง Chain Conveyor': 'Chain Conveyor',
        'สกรูลำเลียง Screw Conveyor': 'Screw Conveyor',
        '328 หมู่ที่ 6 ตำบลคลองนิยมยาตรา อำเภอบางบ่อ สมุทรปราการ 10560':
            '328 Moo 6, Khlong Niyom Yatra, Bang Bo District, Samut Prakan 10560, Thailand',

        /* ---------- Footer service index ---------- */
        'บริการรับทำสายพานลำเลียงครบวงจร': 'Complete Conveyor Services',
        'รับทำสายพานลำเลียง': 'Conveyor Manufacturing',
        'รับออกแบบสายพานลำเลียง': 'Conveyor Design',
        'รับติดตั้งสายพานลำเลียง': 'Conveyor Installation',
        'ระบบสายพานลำเลียงโรงงาน': 'Factory Conveyor Systems',
        'Roller Conveyor / ลูกกลิ้งลำเลียง': 'Roller Conveyors',
        'สายพานลำเลียง PVC และ PU': 'PVC & PU Conveyor Belts',
        'สายพานลำเลียงสินค้า': 'Goods Handling Conveyors',
        'ระบบลำเลียงอัตโนมัติ': 'Automated Conveying',
        'งาน Shutdown โรงงาน': 'Factory Shutdown Work',
        'บริษัท Conveyor สมุทรปราการ — ให้บริการสายพานลำเลียง สมุทรปราการ กรุงเทพฯ ชลบุรี ระยอง ฉะเชิงเทรา และทั่วประเทศไทย':
            'Conveyor company in Samut Prakan — serving Samut Prakan, Bangkok, Chonburi, Rayong, Chachoengsao and all of Thailand.',

        /* ---------- Services page: hero ---------- */
        'ออกแบบติดตั้ง': 'Design & Installation of',
        'ระบบสายพานลำเลียงโรงงาน': 'Factory Conveyor Systems',
        'ที่ตอบโจทย์ความต้องการของคุณ': 'Built Around What You Need',
        'ต้องการใช้ระบบลำเลียงแบบใดเรียกใช้เรา งานเทิร์นคีย์ทำได้ครบจบได้ทุกแบบ ตอบโจทย์การใช้งานไลน์การผลิตแบบออโตเมชั่นและแบบกึ่งอัตโนมัติ ไลน์การประกอบ ไลน์การบรรจุหีบห่อ และการลำเลียงขนย้าย':
            'Whatever conveying system you need, call us. We deliver complete turn-key projects for fully automated and semi-automatic production lines, assembly lines, packing lines and material transfer.',
        'งานเทิร์นคีย์ครบจบในที่เดียว ทั้งไลน์การผลิต ไลน์การประกอบ และไลน์บรรจุหีบห่อ':
            'Complete turn-key projects — production, assembly and packing lines, all from one partner.',
        'ขอใบเสนอราคา': 'Request a Quote',
        'ปรึกษาผ่าน LINE': 'Chat on LINE',

        /* ---------- Services page: hero value badges ---------- */
        'รวดเร็ว': 'Fast',
        'ตอบสนองไว': 'Quick response',
        'มืออาชีพ': 'Professional',
        'ประสบการณ์สูง': 'Highly experienced',
        'เชื่อถือได้': 'Dependable',
        'งานคุณภาพ': 'Quality work',
        'ครบวงจร': 'End to end',
        'จบในที่เดียว': 'One partner, whole job',

        /* ---------- Services page: 5 core services ---------- */
        'บริการ': 'Our',
        'ของเรา': 'Services',
        'ครอบคลุมทุกความต้องการ เพื่อให้ระบบลำเลียงของคุณทำงานได้อย่างราบรื่น':
            'Covering every requirement, so your conveying system keeps running smoothly.',
        'บริการออกแบบ': 'Design Service',
        'ออกแบบระบบลำเลียงโดยวิศวกร คำนวณโหลด ความเร็ว และเลย์เอาท์ให้พอดีกับพื้นที่โรงงาน':
            'Conveyor design by engineers — load, speed and layout calculated to fit your factory floor.',
        'บริการผลิต': 'Manufacturing',
        'ผลิตสายพานลำเลียงและงานโครงสร้างเหล็กตามแบบ รองรับทุกชนิดสายพานและโซ่ลำเลียง':
            'Conveyors and structural steel built to drawing, covering every belt and chain type.',
        'บริการติดตั้ง': 'Installation',
        'ติดตั้งระบบลำเลียงพร้อมระบบไฟฟ้าควบคุม ทดสอบเดินระบบจนส่งมอบงาน':
            'Installation complete with electrical controls, commissioned and tested through to handover.',
        'บริการบำรุงรักษา': 'Maintenance',
        'ตรวจเช็ค ตั้งศูนย์สายพาน เปลี่ยนอะไหล่ รองรับงาน Shutdown โรงงานตามกำหนดเวลา':
            'Inspection, belt tracking and parts replacement — shutdown work delivered on schedule.',
        'ปรับปรุงและอัพเกรด': 'Upgrades',
        'ปรับปรุงไลน์เดิม ขยายระบบ ย้ายไลน์ และแก้ปัญหาระบบที่ติดตั้งมาจากที่อื่น':
            'Improving existing lines, extending systems, relocating lines and fixing other builders’ work.',

        /* ---------- Services page: why us checklist ---------- */
        'ทำไมต้องเลือก': 'Why Choose',
        'ออกแบบผลิตโดยวิศวกรเครื่องกลและวิศวกรไฟฟ้า ประสบการณ์กว่า 10 ปี':
            'Designed and built by mechanical and electrical engineers with over 10 years of experience',
        'ติดตั้งระบบลำเลียงด้วยช่างเทคนิคผู้ชำนาญการ':
            'Installed by specialist technicians',
        'ควบคุมด้วยอุปกรณ์เทคโนโลยีสากลในราคาคนไทย':
            'Controlled with international-standard technology at Thai prices',
        'ใช้งานได้ครบเต็มประสิทธิภาพตามสเปคที่ต้องการ':
            'Runs at full rated performance to the specification you require',
        'บริการหลังการขาย Onsite Service รวดเร็วตลอดอายุการใช้งาน พร้อมอะไหล่ครบทุกชิ้น':
            'Fast on-site after-sales service for the whole service life, with every spare part in stock',
        'รับงานครอบคลุมสมุทรปราการ กรุงเทพฯ ฉะเชิงเทรา ชลบุรี ระยอง และปราจีนบุรี':
            'Serving Samut Prakan, Bangkok, Chachoengsao, Chonburi, Rayong and Prachinburi',

        /* ---------- Services page: process steps ---------- */
        'ขั้นตอน': 'Our',
        'การให้บริการ': 'Process',
        'ติดต่อเรา': 'Contact Us',
        'แจ้งปัญหาหรือความต้องการของคุณ': 'Tell us the problem or what you need',
        'สำรวจหน้างาน': 'Site Survey',
        'ทีมงานเข้าตรวจสอบพื้นที่และประเมินงาน': 'Our team inspects the site and assesses the job',
        'เสนอแบบและราคา': 'Design & Quote',
        'เสนอแนวทางออกแบบพร้อมใบเสนอราคา': 'We propose a design approach with a quotation',
        'ผลิตและติดตั้ง': 'Build & Install',
        'ดำเนินการผลิตและติดตั้งตามแผนงาน': 'Manufacturing and installation to the agreed plan',
        'ทดสอบและส่งมอบ': 'Test & Handover',
        'ทดสอบเดินระบบ ส่งมอบงาน และรับประกัน': 'System commissioning, handover and warranty',

        /* ---------- Services page: closing CTA ---------- */
        'พร้อมดูแลระบบลำเลียงของคุณ': 'Ready to look after your conveying system',

        /* ---------- Services page: industries & areas ---------- */
        'อุตสาหกรรมที่เรา': 'Industries We',
        'ให้บริการ': 'Serve',
        'เราออกแบบระบบลำเลียงให้เหมาะกับลักษณะสินค้าและสภาพแวดล้อมของแต่ละอุตสาหกรรมโดยเฉพาะ':
            'We design conveying systems around the product being handled and the working environment of each industry.',
        'โรงงานผลิตอาหารสัตว์': 'Animal Feed Plants',
        'โรงงานผลิตชิ้นส่วนอิเล็กทรอนิกส์': 'Electronics Component Plants',
        'โรงงานประกอบรถยนต์': 'Automotive Assembly Plants',
        'โรงงานผลิตเครื่องดื่ม': 'Beverage Plants',
        'โรงงานที่ต้องการใช้ระบบลำเลียง': 'Any Factory Needing a Conveying System',
        'รับงาน': 'Serving',
        'ทุกนิคมอุตสาหกรรม': 'Every Industrial Estate',
        'สมุทรปราการ': 'Samut Prakan',
        'กรุงเทพมหานคร': 'Bangkok',
        'ฉะเชิงเทรา': 'Chachoengsao',
        'ชลบุรี': 'Chonburi',
        'ระยอง': 'Rayong',
        'ปราจีนบุรี': 'Prachinburi',

        /* ---------- Services page: why us ---------- */
        'ทำไมต้อง': 'Why',
        'เลือกเรา': 'Choose Us',
        'ออกแบบผลิตโดย': 'Designed and built by',
        'วิศวกรเครื่องกลและวิศวกรไฟฟ้า': 'mechanical and electrical engineers',
        'ประสบการณ์กว่า 10 ปี': 'with over 10 years of experience',
        'ติดตั้งระบบลำเลียงด้วย': 'Conveyor installation by',
        'ช่างเทคนิคผู้ชำนาญการ': 'specialist technicians',
        'ควบคุมด้วย': 'Controlled with',
        'อุปกรณ์เทคโนโลยีสากล': 'international-standard technology',
        'ในราคาคนไทย': 'at Thai prices',
        'ใช้งานได้': 'Runs at',
        'ครบเต็มประสิทธิภาพตามสเปค': 'full rated performance to the specification',
        'ที่ต้องการ': 'you require',
        'มีบริการหลังการขาย': 'After-sales',
        'ที่รวดเร็วตลอดอายุการใช้งาน พร้อมอะไหล่ครบทุกชิ้น':
            'responds fast for the whole service life, with every spare part in stock',

        /* ---------- Services page: outcomes ---------- */
        'ผลลัพธ์ที่': 'Results That',
        'ต้องได้จริง': 'Actually Land',
        'ในการผลิตและติดตั้งระบบลำเลียง เราเน้นผลลัพธ์ที่วัดได้ ไม่ใช่แค่ส่งมอบเครื่องจักร':
            'When we build and install a conveying system we aim at measurable results, not just delivering machinery.',
        'เพิ่มประสิทธิภาพกำลังการผลิต ให้ได้ผลผลิตที่ต้องการในเวลาที่เท่าๆ กัน':
            'Raise production capacity so you get the output you want in the same amount of time.',
        'สินค้าที่ผลิตออกมาได้มาตรฐานสม่ำเสมอ': 'Consistent, standard-compliant product quality.',
        'ลดความสูญเสียในกระบวนการผลิต': 'Reduce losses in the production process.',
        'แก้ปัญหาการขาดแคลนแรงงาน ลดการใช้แรงงานคน เพื่อลดปัญหาเรื่องคน':
            'Solve labour shortages and cut manual handling, reducing people-related problems.',
        'คำนวณ Output ได้แม่นยำ ช่วยในการตัดสินใจและวางแผนการตลาด':
            'Calculate output precisely, supporting better decisions and marketing plans.',

        /* ---------- Services page: capability ---------- */
        'สินค้าและบริการ': 'Products & Services',
        'บริษัทรับออกแบบติดตั้ง': 'Conveyor Design & Installation Company,',
        'สายพานลำเลียง Conveyor สมุทรปราการ': 'Samut Prakan',
        'ผู้เชี่ยวชาญงานสร้างระบบลำเลียงโดยวิศวกรผู้ชำนาญงาน มีผลงานการติดตั้งระบบสายพานลำเลียงในไลน์การผลิตและไลน์การประกอบ ระบบลูกกลิ้งลำเลียงในไลน์การบรรจุหีบห่อ (Conveyor for Packing Line) คำนวณออกแบบจัดวางเลย์เอาท์ของไลน์ให้ลงตัวกับลักษณะงานและพื้นที่ภายในโรงงาน รับงานติดตั้งเครื่องจักรและระบบควบคุม พร้อมงานวิศวกรรมโครงสร้างเหล็กครบวงจร':
            'Specialists in building conveying systems, staffed by experienced engineers. Our track record covers conveyor installations on production and assembly lines, and roller conveyors on packing lines. We calculate and lay the line out to suit both the work and the space inside your factory, and take on machinery installation, control systems and complete structural steel engineering.',
        'เราเป็นผู้ผลิตและติดตั้งระบบลำเลียงตามแบบของลูกค้า พร้อมรับออกแบบติดตั้งระบบขนถ่ายลำเลียงทุกประเภท และรับก่อสร้างอาคารโรงงานตามชนิดของอุตสาหกรรม ให้บริการทั้งโรงงานของคนไทยและโรงงานชาวต่างชาติ':
            'We manufacture and install conveying systems to customer drawings, design and install material handling systems of every type, and construct factory buildings to suit each industry — serving both Thai-owned and foreign-owned plants.',

        /* ---------- Services page: conveyor types ---------- */
        'ประเภท': 'Types of',
        'ระบบลำเลียง': 'Conveying System',
        'ที่ผลิตและติดตั้ง': 'We Build and Install',
        'สายพานลำเลียง PVC และ PU': 'PVC and PU Belt Conveyors',
        'สายพานโมดูลาร์ ยาง และตะแกรงลวด': 'Modular, Rubber and Wire Mesh Belts',
        'สายพานลำเลียงแบบโค้งและลาดเอียง': 'Curve and Incline Conveyors',
        'ระบบโซ่ลำเลียงและแผ่นระนาด': 'Chain and Slat Conveyors',
        'สกรูลำเลียงและกระพ้อลำเลียง': 'Screw Conveyors and Bucket Elevators',
        'ลำเลียงแนวดิ่ง สุญญากาศ และแม่เหล็ก': 'Vertical, Vacuum and Magnetic Conveying',
        'ลำเลียงแบบสั่นและถังปากกรวย': 'Vibrating Conveyors and Hopper Tanks',
        'ตะแกรงคัดขนาด': 'Grading Screen',
        /* NOTE: 'สายพานลำเลียง' is already defined above (hero) — do not redeclare */
        'และลูกกลิ้งลำเลียง': 'and Roller Conveyors',
        'โซ่ สกรู': 'Chain, Screw',
        'และระบบลำเลียงเฉพาะทาง': 'and Specialised Conveying',
        'ระบบลูกกลิ้งลำเลียง ลูกกลิ้งโค้ง และลูกบอลเปลี่ยนทิศ':
            'Roller conveyors, roller drive curves and ball transfer units',
        'ระบบโซ่ลำเลียง Overhead / Pallet / Top Chain':
            'Overhead / pallet / top chain conveyors',
        /* conveyor sub-type chips */
        'เกรดสัมผัสอาหาร': 'Food Grade',
        'สายพานลำเลียง PU': 'PU Belt Conveyor',
        'สายพานเส้นกลมและเชือก': 'Cord & Round Belt',
        'ลูกกลิ้งลำเลียง': 'Roller Conveyor',
        'ลูกกลิ้งลำเลียงโค้ง': 'Roller Drive Curve',
        'ลูกบอลเปลี่ยนทิศ': 'Ball Transfer',
        'โซ่ลำเลียงแขวน Overhead': 'Overhead Chain',
        'โซ่ลำเลียงพาเลท': 'Pallet Chain',
        'โซ่ลำเลียง Top Chain': 'Top Chain',
        'สกรูลำเลียง Spiral': 'Spiral Conveyor',
        'สกรูลำเลียงสแตนเลส': 'Stainless Screw Conveyor',
        'เครื่องดูดลำเลียงสุญญากาศ': 'Vacuum Conveyor',
        'ระบบลำเลียงแม่เหล็ก': 'Magnetic Conveyor',
        'เครื่องลำเลียงแบบสั่น': 'Vibrating Conveyor',
        'ถังปากกรวย-ฮอปเปอร์': 'Hopper Tank',
        'สายพานโมดูลาร์พลาสติก': 'Plastic Modular Belt Conveyor',
        'สายพานยาง': 'Rubber Belt Conveyor',
        'สายพานตะแกรงลวด': 'Wire Mesh Belt Conveyor',
        'สายพานเส้นกลมและเชือก': 'Cord and Round Belt Conveyor',
        'สายพานลำเลียงแบบโค้ง': 'Curve Belt Conveyor',
        'สายพานลำเลียงแบบลาดเอียง': 'Incline Conveyor Belt',
        'ระบบลูกกลิ้งลำเลียง': 'Roller Conveyor System',
        'ลูกกลิ้งลำเลียงโค้งและลูกบอลเปลี่ยนทิศ': 'Roller Drive Curve and Ball Transfer',
        'ระบบโซ่ลำเลียง': 'Chain Conveyor Systems',
        'โซ่ลำเลียงแบบแผ่นระนาด': 'Slat Conveyor',
        'เครื่องดูดลำเลียงแบบสุญญากาศ': 'Vacuum Conveyor',
        'สกรูลำเลียง': 'Screw Conveyor',
        'กระพ้อลำเลียง': 'Bucket Elevator',
        'เครื่องลำเลียงแนวดิ่ง': 'Vertical Lifter',
        'ระบบลำเลียงด้วยแม่เหล็ก': 'Magnetic Conveyor',
        'เครื่องลำเลียงแบบสั่น พร้อมตะแกรงคัดขนาด': 'Vibrating Conveyor with Grading Screen',
        'ระบบลำเลียงด้วยถังปากกรวย-ฮอปเปอร์': 'Conveyor with Hopper Tank',

        /* ---------- Services page: photo showcase ---------- */
        'ผลงานติดตั้งจริง': 'Real Installations',
        'ปรับปรุงไลน์เดิม': 'Existing Line Upgrades',
        'ตัวอย่าง': 'Examples of',
        'ระบบลำเลียงที่เราสร้าง': 'Conveying Systems We Have Built',
        'ภาพจากงานออกแบบ ผลิต และติดตั้งจริง ทั้งไลน์การผลิต ไลน์บรรจุ และงานคัดแยก':
            'Photographs from real design, manufacturing and installation work — production lines, packing lines and sorting systems.',
        'ระบบลำเลียงในสายการผลิต': 'Production Line Conveying',
        'สายพานลำเลียง PVC': 'PVC Belt Conveyor',
        'ลูกกลิ้งลำเลียง Roller Conveyor': 'Roller Conveyor',
        'โซ่ลำเลียง Chain Conveyor': 'Chain Conveyor',
        'สกรูลำเลียง Screw Conveyor': 'Screw Conveyor',
        'ระบบลำเลียงงานรีไซเคิล': 'Recycling Conveyor Systems',

        /* ---------- Services page: machinery ---------- */
        'รับติดตั้ง': 'Installation of',
        'เครื่องจักรและอุปกรณ์ส่วนควบ': 'Machinery and Ancillary Equipment',
        'ในระบบลำเลียง': 'in Conveying Systems',
        'เครื่องชั่งน้ำหนักอัตโนมัติ Automatic Weigh Checker และระบบ OCR':
            'Automatic weigh checkers and OCR systems',
        'เครื่องเซ็นเซอร์ตรวจจับและคัดแยก': 'Detection and sorting sensors',
        'เครื่องชั่งบรรจุและระบบชั่งผสม': 'Filling scales and blending weigh systems',
        'เครื่องปิดฉลาก': 'Labelling machines',
        'เครื่องสแกนบาร์โค้ด': 'Barcode scanners',
        'เครื่องพิมพ์วันที่ผลิตและวันหมดอายุ': 'Production and expiry date printers',
        'เครื่องปิดเทปและเครื่องรัดกล่อง': 'Carton tapers and strapping machines',
        'เครื่องชริงค์ฟิล์ม': 'Shrink film machines',
        'เครื่องพันพาเลท': 'Pallet wrappers',
        'เครื่องป้อนชิ้นงาน': 'Part feeders',
        'แขนกลโรบอท Robotic': 'Robotic arms',
        'เครื่องย่อยทำลายวัตถุรีไซเคิล': 'Recycling shredders',
        'อุปกรณ์ยกและขนถ่าย Material Handling Equipment เช่น เอ็กซ์ลิฟท์ X-Lift':
            'Lifting and material handling equipment such as the X-Lift',

        /* ---------- Services page: upgrade existing lines ---------- */
        'มีปัญหาเรื่อง': 'Problems With Your',
        'ไลน์เดิม': 'Existing Line',
        '? ติดต่อเรา': '? Talk to Us',
        'ไลน์การผลิต ไลน์การประกอบ และไลน์การบรรจุเดิมที่ใช้งานอยู่ เราเข้าไปแก้ให้ได้':
            'Production, assembly and packing lines already in service — we can go in and fix them.',
        'รับปรับปรุงสายการผลิตเดิม สร้างระบบลำเลียงเพื่อลดจำนวนคนและลดต้นทุนการผลิต':
            'Upgrading existing production lines, adding conveying to cut headcount and production cost.',
        'รับซ่อมและปรับปรุงแก้ปัญหาระบบลำเลียงเดิมที่ติดตั้งมาจากที่อื่น':
            'Repairing and fixing existing conveying systems installed by others.',
        'รับออกแบบขยายระบบลำเลียงและไลน์การผลิตเดิม':
            'Designing extensions to existing conveying systems and production lines.',
        'รับย้ายคอนเวเยอร์ไลน์เดิม': 'Relocating existing conveyor lines.',
        'ตรวจสอบและปรับปรุงระบบควบคุมการทำงานของคอนเวเยอร์':
            'Inspecting and upgrading conveyor control systems.',

        /* ---------- Services page: closing CTA ---------- */
        'ต้องการใช้ระบบลำเลียงแบบใด เรียกใช้เรา': 'Whatever conveying system you need — call us',
        'ส่งแบบหรือรูปหน้างานมาให้เราประเมิน ทีมวิศวกรจะติดต่อกลับพร้อมแนวทางและใบเสนอราคา':
            'Send us a drawing or site photos and our engineering team will come back with an approach and a quotation.',

        /* ---------- About page ---------- */
        'เกี่ยวกับ': 'About',
        'ผู้เชี่ยวชาญด้านระบบลำเลียงอุตสาหกรรมมากกว่า 10 ปี':
            'Over 10 years of expertise in industrial conveyor systems,',
        'ที่ไว้วางใจโดยโรงงานชั้นนำทั่วประเทศ':
            'trusted by leading factories across Thailand.',
        'ปีประสบการณ์': 'Years of Experience',
        'โปรเจกต์ที่สำเร็จ': 'Completed Projects',
        'ลูกค้าที่ไว้วางใจ': 'Trusted Clients',
        'บริการหลังการขาย': 'After-Sales Service',
        'ก่อตั้งปี พ.ศ. 2521': 'Established in 1978',
        'ประวัติบริษัท': 'Company History',
        'บีเอสเอส โซลูชั่น (1978) ก่อตั้งขึ้นด้วยความมุ่งมั่นที่จะเป็นผู้นำด้านระบบลำเลียงอุตสาหกรรมในประเทศไทย ด้วยประสบการณ์มากกว่า 4 ทศวรรษ เราได้พัฒนาและส่งมอบโซลูชั่นที่มีคุณภาพให้กับโรงงานชั้นนำทั่วประเทศ':
            'BSS Solution (1978) was founded with the ambition of leading Thailand’s industrial conveyor industry. Over more than four decades we have developed and delivered quality solutions to leading factories nationwide.',
        'จากจุดเริ่มต้นเล็กๆ เราเติบโตขึ้นมาเป็นผู้เชี่ยวชาญด้าน Conveyor System ที่ครอบคลุมตั้งแต่การวางแผน (Consulting), ออกแบบ (Design), ผลิต (Manufacturing), ติดตั้ง (Installation) ไปจนถึงการซ่อมบำรุง (Maintenance) แบบ Turn-key':
            'From modest beginnings we have grown into a conveyor system specialist covering consulting, design, manufacturing, installation and maintenance on a turn-key basis.',
        'ด้วยทีมวิศวกรและช่างผู้เชี่ยวชาญ เราพร้อมรับทุกความท้าทายและส่งมอบระบบที่มีประสิทธิภาพสูงสุด ตอบโจทย์ทุกอุตสาหกรรม ไม่ว่าจะเป็นอาหาร เครื่องดื่ม ยานยนต์ หรือโลจิสติกส์':
            'With expert engineers and technicians, we take on every challenge and deliver systems of the highest efficiency — for food, beverage, automotive and logistics industries alike.',
        'วิสัยทัศน์ &': 'Vision &',
        'พันธกิจ': 'Mission',
        'วิสัยทัศน์': 'Vision',
        'มุ่งสู่การเป็นบริษัทชั้นนำระดับภูมิภาคด้านระบบสายพานลำเลียงและระบบอัตโนมัติสำหรับอุตสาหกรรม ด้วยการผสมผสานเทคโนโลยีที่ทันสมัย ความเชี่ยวชาญในเชิงวิศวกรรม และความใส่ใจในคุณภาพทุกขั้นตอน เพื่อเพิ่มขีดความสามารถในการแข่งขันให้แก่ลูกค้าทุกราย':
            'To become a regional leader in conveyor and industrial automation systems by combining modern technology, engineering expertise and attention to quality at every step — strengthening the competitiveness of every client we serve.',
        'ออกแบบและส่งมอบระบบลำเลียงที่มีประสิทธิภาพสูงสุด ลดต้นทุนการผลิต และเพิ่มความปลอดภัยในโรงงาน โดยใช้วัสดุคุณภาพสูง วิศวกรรมที่แม่นยำ พร้อมบริการหลังการขายที่รวดเร็วและเชื่อถือได้ เพื่อสร้างความสัมพันธ์ระยะยาวกับลูกค้าทุกราย':
            'To design and deliver highly efficient conveyor systems that cut production costs and improve factory safety — using quality materials, precise engineering and fast, dependable after-sales service that builds long-term client relationships.',
        'ค่านิยมหลักของเรา': 'Our Core Values',
        'คุณภาพสูงสุด': 'Uncompromising Quality',
        'ใช้วัสดุและกระบวนการที่ได้มาตรฐานสากล ส่งมอบงานที่ดีที่สุดทุกครั้ง':
            'International-standard materials and processes, delivering our best work every time.',
        'ประสิทธิภาพ': 'Efficiency',
        'ออกแบบระบบที่ตอบโจทย์การผลิต ลดเวลาและต้นทุน เพิ่มผลผลิตสูงสุด':
            'Systems designed around your production line — less time, lower cost, maximum output.',
        'พันธมิตรที่เชื่อถือได้': 'A Partner You Can Trust',
        'สร้างความสัมพันธ์ระยะยาว ตอบสนองความต้องการลูกค้าด้วยความซื่อสัตย์':
            'Building long-term relationships and meeting client needs with honesty.',
        'ความปลอดภัย': 'Safety',
        'ออกแบบระบบที่คำนึงถึงความปลอดภัยของผู้ปฏิบัติงานเป็นอันดับหนึ่ง':
            'Every system is designed with operator safety as the first priority.',
        'พัฒนาและนำเทคโนโลยีใหม่มาประยุกต์ใช้เพื่อโซลูชั่นที่ดีขึ้นอย่างต่อเนื่อง':
            'Continuously developing and applying new technology for ever-better solutions.',
        'ทีมช่างพร้อมดูแลและซ่อมบำรุงตลอด 24 ชั่วโมง 7 วัน ไม่หยุดพัก':
            'Our technicians are on call for service and maintenance 24 hours a day, 7 days a week.',
        'พร้อมร่วมงานกับเราแล้วหรือยัง?': 'Ready to work with us?',
        'ติดต่อทีมผู้เชี่ยวชาญของเราวันนี้ เพื่อรับคำปรึกษาฟรีและใบเสนอราคา':
            'Contact our specialist team today for a free consultation and quotation.',
        'ดูบริการทั้งหมด': 'View All Services',
        '© 2024 บริษัท บีเอสเอส โซลูชั่น (1978) จำกัด |':
            '© 2024 BSS Solution (1978) Co., Ltd. |',

        /* ---------- Articles page ---------- */
        'อัปเดตเทคโนโลยีระบบลำเลียงและข่าวสารจาก BSS SOLUTION':
            'Conveyor technology updates and news from BSS SOLUTION',
        'เทคโนโลยีระบบลำเลียงอัตโนมัติ 4.0 สำหรับโรงงานอุตสาหกรรมยุคใหม่':
            'Industry 4.0 Automated Conveyor Technology for the Modern Factory',
        'เจาะลึกกระบวนการ ออกแบบสายพานลำเลียงอุตสาหกรรม เพื่อยกระดับความเร็วและประสิทธิภาพการผลิตอย่างคุ้มค่าสูงสุด...':
            'An in-depth look at industrial conveyor design that lifts production speed and efficiency at the best possible value...',
        'การเลือกสายพานลำเลียงคัดแยกขยะและ Recycle Equipment':
            'Selecting Sorting Conveyors and Recycling Equipment',
        'ทำความเข้าใจการประยุกต์ใช้โซ่ลำเลียงและระบบสายพานลำเลียง PVC เพื่อความทนทานในงานคัดแยกขยะรีไซเคิล...':
            'Understanding how chain conveyors and PVC belt systems are applied for durability in recycling and waste sorting...',
        '5 ข้อปฏิบัติช่วงงาน Shutdown โรงงาน เพื่อความปลอดภัยสูงสุด':
            '5 Practices for Maximum Safety During a Factory Shutdown',
        'เคล็ดลับการซ่อมบำรุงและติดตั้งสายพานลำเลียงโรงงานอย่างมืออาชีพในช่วงหยุดสายการผลิตประจำปี...':
            'Professional tips for conveyor maintenance and installation during the annual production shutdown...',
        'เจาะลึกระบบลำเลียงแบบลูกกลิ้งและระบบสกรูลำเลียงประสิทธิภาพสูง':
            'A Deep Dive into High-Performance Roller and Screw Conveyor Systems',
        'เปรียบเทียบการประยุกต์ใช้งานระบบลูกกลิ้งลำเลียงชนิดขับเคลื่อนด้วยกำลังไฟฟ้าและระบบสกรูสแตนเลส...':
            'Comparing the applications of powered roller conveyors and stainless steel screw systems...',
        'การประยุกต์ใช้งานสายพาน PVC และระบบคลังสินค้าอัจฉริยะ':
            'Applying PVC Belts and Smart Warehouse Systems',
        'เจาะลึกประโยชน์ของการเลือกใช้ระบบสายพานลำเลียง PVC ในสายการผลิตชิ้นส่วนอิเล็กทรอนิกส์และอาหาร...':
            'The benefits of choosing PVC belt conveyors on electronics and food production lines...',
        'ออกแบบสายพานลำเลียงอุตสาหกรรมด้วยมาตรฐานระดับสากล':
            'Designing Industrial Conveyors to International Standards',
        'การวิเคราะห์พฤติกรรมการเคลื่อนย้ายวัสดุเพื่อออกแบบระบบสายพานลำเลียงให้ปลอดภัยและทำงานได้ต่อเนื่อง...':
            'Analysing material handling behaviour to design conveyor systems that are safe and run continuously...',
        'สาระน่ารู้: 4 ชนิดสายพานลำเลียงหลักและวิธีการทำงาน':
            'Explained: The 4 Main Conveyor Belt Types and How They Work',
        'มาทำความรู้จักชนิดของวัสดุสายพานลำเลียงอุตสาหกรรม และคุณสมบัติที่เหมาะสมต่อการส่งผ่านชิ้นงานประเภทต่างๆ...':
            'Get to know industrial conveyor belt materials and which properties suit which kinds of loads...',
        'คู่มือการเลือกชุดลูกกลิ้งลำเลียงให้เหมาะสมกับขนาดพื้นที่':
            'A Guide to Sizing Roller Conveyors for Your Available Space',
        'ให้ความรู้เบื้องต้นในการประเมินและเลือกขนาดลูกกลิ้ง ระยะห่าง Pitch เพื่อการลำเลียงพัสดุกล่องและพาเลทอย่างมั่นคง...':
            'An introduction to assessing roller diameter and pitch spacing for stable handling of cartons and pallets...',
        'ความรู้การบำรุงรักษาระบบลำเลียงเชิงป้องกัน (PM Guide)':
            'Preventive Conveyor Maintenance Explained (PM Guide)',
        'คู่มือเบื้องต้นในการดูแลรักษาสายพาน มอเตอร์ และโซ่ลำเลียง เพื่อช่วยลดอุบัติเหตุและหลีกเลี่ยงความเสียหายแบบเฉียบพลัน...':
            'A starter guide to caring for belts, motors and chains to reduce accidents and avoid sudden failures...',

        /* ---------- Dates ---------- */
        '15 พฤษภาคม 2569': '15 May 2026',
        '10 พฤษภาคม 2569': '10 May 2026',
        '1 พฤษภาคม 2569': '1 May 2026',
        '28 เมษายน 2569': '28 April 2026',
        '20 เมษายน 2569': '20 April 2026',
        '15 เมษายน 2569': '15 April 2026',
        '10 เมษายน 2569': '10 April 2026',
        '5 เมษายน 2569': '5 April 2026',
        '1 เมษายน 2569': '1 April 2026',

        /* ---------- Form placeholders ---------- */
        'ชื่อของคุณ': 'Your name',
        'ข้อความของคุณ': 'Your message'
    };

    /**
     * Full article bodies for the articles.html modal. The Thai originals live in
     * the `articlesData` object inside articles.html; these mirror them by id.
     */
    var ARTICLES_EN = {
        1: '<h2>Industry 4.0 Automated Conveyor Technology for the Modern Factory</h2>' +
           '<p>Factories today are moving into the Industry 4.0 era at speed, and a high-performance material handling system inside the production process has become indispensable. As a <span class="seo-highlight">conveyor belt manufacturer in Samut Prakan</span> with over 10 years of service, BSS SOLUTION (1978) specialises in <span class="seo-highlight">industrial conveyor design</span> that fits every kind of production line.</p>' +
           '<h3>Raising Process Efficiency with Smart Conveying</h3>' +
           '<p>The key to lifting factory efficiency is understanding each type of <span class="seo-highlight">conveyor system</span> and <span class="seo-highlight">conveyor belt</span>, so you can reduce operator error and move parts faster. Our engineering team is committed to <span class="seo-highlight">designing and manufacturing conveyor systems</span> that suit your floor space, working environment and the products being moved.</p>' +
           '<p>Investing in standards-compliant conveying machinery extends service life, lowers loss rates and delivers a visibly better return on investment.</p>',

        2: '<h2>Selecting Sorting Conveyors and Recycling Equipment</h2>' +
           '<p>In recycling operations the sorted material varies widely and brings heavy abrasion and moisture. Purpose-built <span class="seo-highlight">recycling equipment</span> is therefore essential to keeping the process running continuously and without breakdowns.</p>' +
           '<h3>The Role of Chain Systems and PVC Belts in Sorting</h3>' +
           '<p>For heavy or rough-edged material, a <span class="seo-highlight">chain conveyor system</span> — the <span class="seo-highlight">CHAIN CONVEYOR</span> — is far more durable than a standard belt, because the steel frame and chain links absorb impact well.</p>' +
           '<p>Conversely, for plastic bottles, paper or general organic waste, a <span class="seo-highlight">PVC belt conveyor system</span> is the more economical and flexible choice. A <span class="seo-highlight">PVC conveyor belt</span> resists acids, chemicals and oils, protecting the belt surface from damage.</p>',

        3: '<h2>5 Practices for Maximum Safety During a Factory Shutdown</h2>' +
           '<p>When the annual <span class="seo-highlight">factory shutdown</span> comes around, the top priority for maintenance and production teams is to inspect and repair the entire material handling system so it returns to service quickly, safely and without worry.</p>' +
           '<h3>Look for Genuine Installation and Maintenance Specialists</h3>' +
           '<p>BSS SOLUTION (1978) has a professional team for inspection, upgrades and <span class="seo-highlight">conveyor installation in Samut Prakan</span> and throughout the eastern region. Our <span class="seo-highlight">factory conveyor installation service in Chonburi</span> covers belt tracking, splicing and replacement of worn or damaged parts.</p>' +
           '<p>With decades of experience, we offer <span class="seo-highlight">complete conveyor design, manufacture and installation</span>, so you can be confident your system will run at full capacity the moment the factory restarts.</p>',

        4: '<h2>A Deep Dive into High-Performance Roller and Screw Conveyor Systems</h2>' +
           '<p>Moving cartons, crates or large pallets calls for a stable, consistent drive system, which is why <span class="seo-highlight">roller conveyor</span> technology is the most popular choice in logistics and warehousing today.</p>' +
           '<h3>Differences and Applications: Rollers vs. Screw Conveyors</h3>' +
           '<p>There are several categories of material handling equipment to choose from:</p>' +
           '<ul>' +
           '<li>Standard <span class="seo-highlight">roller conveyor</span>: suited to moving loads by weight or gravity.</li>' +
           '<li><span class="seo-highlight">POWER ROLLER CONVEYOR</span>: motor-driven rollers for controlling speed and stopping items at each work station.</li>' +
           '<li><span class="seo-highlight">CURVE TAPER ROLLER CONVEYOR</span>: for curved runs that save floor space and keep cartons from drifting off line.</li>' +
           '<li>Automated <span class="seo-highlight">roller conveyor systems</span>: movement controlled by smart sensors.</li>' +
           '</ul>' +
           '<p>For food, chemical or flour industries that demand high cleanliness and zero contamination, a <span class="seo-highlight">stainless steel screw conveyor</span> prevents rust, washes down easily and moves powders or granules reliably without leakage.</p>',

        5: '<h2>Applying PVC Belts and Smart Warehouse Systems</h2>' +
           '<p>Modern warehouse management demands agility and speed, and automated sorting is one of its core innovations. Combining a <span class="seo-highlight">PVC conveyor belt</span> with sensor technology sorts different item types faster and more accurately.</p>' +
           '<h3>Why a PVC Belt Conveyor Stands Out on the Production Line</h3>' +
           '<p>Installing a <span class="seo-highlight">PVC belt conveyor system</span> serves small and mid-sized production lines very effectively. Its smooth belt surface does not scuff cartons or packaging, which cuts reject rates measurably.</p>' +
           '<p>BSS SOLUTION is always glad to advise on and assess a system that matches your warehouse budget and capacity.</p>',

        6: '<h2>Designing Industrial Conveyors to International Standards</h2>' +
           '<p>Building a material handling system for a large production line requires precise engineering calculation. <span class="seo-highlight">Industrial conveyor design</span> by specialist engineers is therefore the first thing any operator should pay attention to.</p>' +
           '<h3>Why Choose a Professional Team from a Samut Prakan Factory</h3>' +
           '<p>Equipped with modern fabrication machinery, BSS SOLUTION (1978) — a <span class="seo-highlight">conveyor belt manufacturer in Samut Prakan</span> — enforces the highest safety standards at every stage: steel frame fabrication, bearing installation, belt tensioning and inverter-based motor control that minimises electricity use.</p>' +
           '<p>If you are looking to upgrade machinery or a conveying system, we are ready to deliver the best service for the long-term sustainability of your production process.</p>',

        7: '<h2>Explained: The 4 Main Conveyor Belt Types and How They Work</h2>' +
           '<p>Industrial material handling relies on several main categories of equipment, each moving loads differently. Studying the details of each <span class="seo-highlight">conveyor belt</span> and <span class="seo-highlight">conveyor system</span> helps you get far more value from the investment.</p>' +
           '<h3>General Knowledge of Conveying Technologies</h3>' +
           '<ul>' +
           '<li><strong>Flat belt conveyors:</strong> commonly a <span class="seo-highlight">PVC conveyor belt</span> for general work, or PU where there is direct food contact.</li>' +
           '<li><strong>PVC belt conveyor systems:</strong> for applications needing quiet running and consistent speed control.</li>' +
           '<li><strong>Steel-framed chain conveyors:</strong> more stable in high temperatures or under impact loads.</li>' +
           '<li><strong>Gravity incline roller conveyors:</strong> move cartons and packaging without electricity, an excellent way to cut running costs.</li>' +
           '</ul>',

        8: '<h2>A Guide to Sizing Roller Conveyors for Your Available Space</h2>' +
           '<p>Handling cartons, wooden crates or large workpieces means the dimensions and structure of the <span class="seo-highlight">roller conveyor</span> must be designed around the product’s shape.</p>' +
           '<h3>Criteria for Assessment and Structural Design</h3>' +
           '<p>The basic calculations to keep in mind are:</p>' +
           '<ul>' +
           '<li>The width of the <span class="seo-highlight">roller conveyor</span> should exceed the carton by at least 50 mm.</li>' +
           '<li>Roller pitch must keep at least three rollers under the load at all times so travel is never interrupted.</li>' +
           '<li>Curved runs using a <span class="seo-highlight">CURVE TAPER ROLLER CONVEYOR</span> must hold the carton on its centre line so nothing tips or falls.</li>' +
           '<li>Where constant speed is required, choose a <span class="seo-highlight">POWER ROLLER CONVEYOR</span> — a motor-driven <span class="seo-highlight">roller conveyor system</span> with high precision.</li>' +
           '</ul>',

        9: '<h2>Preventive Conveyor Maintenance Explained (PM Guide)</h2>' +
           '<p>An unplanned production stoppage caused by machinery failure creates enormous business losses. A preventive maintenance (PM) plan is therefore critical to looking after the whole conveying structure.</p>' +
           '<h3>Basic Practices for System Care</h3>' +
           '<p>The specialist engineers at BSS SOLUTION recommend the following industrial maintenance practices:</p>' +
           '<ul>' +
           '<li><strong>Check belt tracking:</strong> watch that the belt does not run off to one side, which can wear the edge out prematurely.</li>' +
           '<li><strong>Lubricate bearings and chains:</strong> apply lubricant regularly to the <span class="seo-highlight">chain conveyor system</span> and the joints of the <span class="seo-highlight">CHAIN CONVEYOR</span> to reduce friction.</li>' +
           '<li><strong>Safety during shutdown:</strong> assign major repairs to specialists during the <span class="seo-highlight">factory shutdown</span> so the whole installation is coordinated safely.</li>' +
           '</ul>'
    };

    /* Normalise whitespace so multi-line HTML source still matches a dict key. */
    function key(s) {
        return s.replace(/\s+/g, ' ').trim();
    }

    var normDict = {};
    Object.keys(DICT).forEach(function (k) { normDict[key(k)] = DICT[k]; });

    var originals = new WeakMap();   // node -> original Thai value
    var origPlaceholders = new WeakMap();
    var currentLang = 'th';

    function shouldSkip(el) {
        if (!el) return true;
        var tag = el.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return true;
        return !!el.closest(SKIP_SELECTOR);
    }

    function translateTextNodes(toEnglish) {
        var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            var parent = node.parentElement;
            if (shouldSkip(parent)) continue;

            if (toEnglish) {
                var raw = node.nodeValue;
                var en = normDict[key(raw)];
                if (en) {
                    if (!originals.has(node)) originals.set(node, raw);
                    // Keep the node's surrounding whitespace — it separates inline elements
                    var edges = raw.match(/^(\s*)[\s\S]*?(\s*)$/);
                    node.nodeValue = edges[1] + en + edges[2];
                }
            } else if (originals.has(node)) {
                node.nodeValue = originals.get(node);
                originals.delete(node);
            }
        }
    }

    function translatePlaceholders(toEnglish) {
        document.querySelectorAll('[placeholder]').forEach(function (el) {
            if (shouldSkip(el)) return;
            if (toEnglish) {
                var en = normDict[key(el.placeholder)];
                if (en) {
                    if (!origPlaceholders.has(el)) origPlaceholders.set(el, el.placeholder);
                    el.placeholder = en;
                }
            } else if (origPlaceholders.has(el)) {
                el.placeholder = origPlaceholders.get(el);
                origPlaceholders.delete(el);
            }
        });
    }

    /* ---------- Article modal (articles.html) ---------- */

    var openArticleId = null;
    var origOpenArticle = null;

    function renderArticleBody() {
        if (openArticleId === null) return;
        var body = document.getElementById('modalBody');
        if (!body) return;
        if (currentLang === 'en' && ARTICLES_EN[openArticleId]) {
            body.innerHTML = ARTICLES_EN[openArticleId];
        } else if (origOpenArticle) {
            origOpenArticle(openArticleId);   // repopulates the modal with the Thai original
        }
    }

    function hookArticleModal() {
        if (typeof window.openArticle !== 'function') return;

        origOpenArticle = window.openArticle;
        window.openArticle = function (id) {
            openArticleId = id;
            origOpenArticle(id);
            if (currentLang === 'en' && ARTICLES_EN[id]) {
                var body = document.getElementById('modalBody');
                if (body) body.innerHTML = ARTICLES_EN[id];
            }
        };

        if (typeof window.closeArticle === 'function') {
            var origClose = window.closeArticle;
            window.closeArticle = function () {
                openArticleId = null;
                origClose();
            };
        }
    }

    var originalTitle = document.title;

    function apply(lang) {
        var toEnglish = lang === 'en';
        currentLang = lang;
        translateTextNodes(toEnglish);
        translatePlaceholders(toEnglish);
        renderArticleBody();
        document.title = toEnglish ? (TITLES[originalTitle] || originalTitle) : originalTitle;
        document.documentElement.lang = toEnglish ? 'en' : 'th';
        try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) { /* private mode */ }
        updateButton();
    }

    /* ---------- Switcher UI ---------- */

    var switcher;

    function buildStyles() {
        if (document.getElementById('bss-lang-styles')) return;
        var css = document.createElement('style');
        css.id = 'bss-lang-styles';
        css.textContent =
            'nav .container > .nav-links{margin-left:auto;}' +
            '#bss-lang-switch{appearance:none;display:inline-flex;align-items:center;gap:7px;' +
            'border:1px solid rgba(255,140,0,.65);border-radius:999px;' +
            'font-family:"Prompt",sans-serif;font-size:13px;font-weight:600;line-height:1;' +
            'letter-spacing:.03em;color:#fff;background:rgba(255,255,255,.06);' +
            'padding:7px 14px;margin-left:1.5rem;flex:0 0 auto;cursor:pointer;' +
            'transition:background .2s ease,color .2s ease,border-color .2s ease;}' +
            '#bss-lang-switch:hover{background:#ff8c00;border-color:#ff8c00;color:#0a192f;}' +
            '#bss-lang-switch:focus-visible{outline:2px solid #ff8c00;outline-offset:3px;}' +
            '#bss-lang-switch svg{width:16px;height:16px;flex:0 0 auto;stroke:currentColor;' +
            'fill:none;stroke-width:1.7;}' +
            '#bss-lang-switch .bss-lang-label{min-width:1.55em;text-align:left;}' +
            '#bss-lang-switch.bss-lang-floating{position:fixed;top:14px;right:16px;z-index:10000;' +
            'background:rgba(10,25,47,.92);box-shadow:0 4px 14px rgba(0,0,0,.35);}' +
            // Comfortable thumb target next to the hamburger on touch screens.
            // min-height keeps it at 44px however the padding rounds out.
            '@media (max-width:900px){#bss-lang-switch{padding:11px 13px;margin-left:auto;min-height:44px;}}' +
            '@media (max-width:480px){#bss-lang-switch{padding:11px;gap:5px;font-size:12px;min-height:44px;}}';
        document.head.appendChild(css);
    }

    /* Globe glyph, drawn with currentColor so it follows the button's hover state. */
    var GLOBE_SVG =
        '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<circle cx="12" cy="12" r="9"/>' +
        '<path d="M3 12h18"/>' +
        '<path d="M12 3c2.5 2.6 3.8 5.7 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.7-3.8-9S9.5 5.6 12 3z"/>' +
        '</svg>';

    function updateButton() {
        if (!switcher) return;
        // The button advertises the language you get by clicking it, not the current one:
        // on a Thai page it reads EN, on an English page it reads TH.
        var target = currentLang === 'th' ? 'en' : 'th';
        var label = switcher.querySelector('.bss-lang-label');
        if (label) label.textContent = target.toUpperCase();
        switcher.setAttribute('aria-label',
            target === 'en' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย');
        switcher.title = target === 'en' ? 'Switch to English' : 'เปลี่ยนเป็นภาษาไทย';
    }

    function buildSwitcher() {
        buildStyles();

        switcher = document.createElement('button');
        switcher.id = 'bss-lang-switch';
        switcher.type = 'button';
        switcher.innerHTML = GLOBE_SVG + '<span class="bss-lang-label">EN</span>';

        switcher.addEventListener('click', function (e) {
            e.preventDefault();
            apply(currentLang === 'th' ? 'en' : 'th');
        });

        placeSwitcher();
    }

    /**
     * Sits as a sibling of .nav-links inside the flex nav container, not inside the
     * list. Below 768px style.css sets .nav-links{display:none} — a display:none
     * parent would hide the switcher with it, so staying outside keeps it reachable
     * on mobile with no JS repositioning.
     */
    function placeSwitcher() {
        var navList = document.querySelector('nav .nav-links');

        if (navList && navList.parentElement) {
            navList.insertAdjacentElement('afterend', switcher);
        } else {
            switcher.classList.add('bss-lang-floating');
            document.body.appendChild(switcher);
        }
    }

    function init() {
        buildSwitcher();
        hookArticleModal();


        var saved;
        try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) { saved = null; }
        apply(saved === 'en' ? 'en' : 'th');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    /* Exposed so the admin editor can restore Thai before saving a page. */
    window.BSSI18n = {
        get lang() { return currentLang; },
        set: apply,
        revertToThai: function () { if (currentLang !== 'th') apply('th'); }
    };
})();
