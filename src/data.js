// All content comes from Zahid_Hasan.docx (CV). Stations are laid out chronologically
// around the island road: 2018 (Tiger Park) -> now (BJIT).

export const profile = {
  name: 'Zahid Hasan',
  title: 'Senior Software Engineer',
  location: 'Mirpur, Dhaka, Bangladesh',
  email: 'zhdruvo@gmail.com',
  phone: '01988353282',
  linkedin: 'https://linkedin.com/in/zhdruvo',
  site: 'https://druvo.github.io',
  summary:
    'Senior Software Engineer with over 8 years of experience across .NET, Python, and mobile/JVM ecosystems, building web, desktop, and backend systems. Comfortable moving between ASP.NET Core, Django, and lightweight Java/Flutter work, with growing use of AI-assisted development tools in daily delivery.',
  stats: [
    { big: '8+', label: 'Years in delivery' },
    { big: '20+', label: 'Enterprise projects' },
    { big: '46', label: 'Largest team' },
  ],
  achievements: [
    ['Over 8 Years in Delivery', 'Backend engineering across ASP.NET, Django, WinForms, and microservices for clients of different sizes.'],
    ['20+ Enterprise Projects', 'ERP, e-commerce, IoT metering, and infrastructure-inspection platforms for enterprise clients.'],
    ['Cross-Functional Teams', 'Engineering teams from 1 to 46 members across enterprise integration, metering, and infrastructure.'],
    ['Certified & Recognized', 'Udemy-certified in Design Patterns in C# and .NET - Clean Architecture and SOLID-driven design.'],
    ['AI-Augmented Development', 'GitHub Copilot, Claude, ChatGPT, Gemini in daily work; exploring MCP and RAG patterns.'],
  ],
  strengths: [
    'Independent, end-to-end ownership of full-stack systems from requirements through deployment.',
    'Direct experience working with Japanese and other international clients.',
    'Regular mentoring and code review on Clean Architecture and SOLID.',
    'Comfortable moving between .NET, Python/Django, and lightweight Java/Flutter work.',
    'Wide domain range: metering, ERP, e-commerce, retail payments, infrastructure inspection.',
  ],
};

export const jobs = [
  ['Programmer', 'Tiger Park Limited', '02/2018 - 09/2020'],
  ['Software Engineer', 'Ektai Limited', '10/2020 - 01/2021'],
  ['Software Engineer', 'Transcom Electronics Limited', '05/2021 - 01/2023'],
  ['Software Engineer', 'BJIT Limited', '01/2023 - 07/2023'],
  ['Senior Software Engineer', 'BJIT Limited', '07/2023 - Current'],
];

// rating out of 5 (from the CV skills matrix)
export const skills = [
  { name: 'C# / ASP.NET Core', rating: 5, note: '.NET 6/7/8, .NET Framework, Web API, SignalR' },
  { name: 'EF Core / LINQ', rating: 5, note: 'Entity Framework Core, LINQ, ADO.NET' },
  { name: 'SQL Server', rating: 5, note: 'Always Encrypted, SSIS, database design' },
  { name: 'WPF / WinForms', rating: 5, note: 'Desktop apps and Windows Services' },
  { name: 'REST & SOAP', rating: 5, note: 'JWT, OAuth2, Swagger' },
  { name: 'CQRS / MediatR', rating: 5, note: 'Repository, Unit of Work, design patterns' },
  { name: 'Clean Arch / DDD', rating: 5, note: 'Microservices and RabbitMQ' },
  { name: 'Requirements', rating: 4, note: 'Analysis and client communication' },
  { name: 'AWS & Azure', rating: 4, note: 'Cloud services' },
  { name: 'CI/CD & Docker', rating: 4, note: 'Docker, Jenkins' },
  { name: 'xUnit & Moq', rating: 4, note: 'Unit testing and mocking' },
  { name: 'AI-assisted dev', rating: 4, note: 'Claude Code, GitHub Copilot' },
  { name: 'Python / Django', rating: 4, note: 'Django REST Framework' },
  { name: 'Java', rating: 2, note: 'Basic working knowledge' },
  { name: 'Flutter', rating: 2, note: 'Basic working knowledge' },
];

export const exploring = ['Kubernetes', 'GitHub Actions', 'Kong (API Gateway)', 'Model Context Protocol (MCP)', 'Retrieval-Augmented Generation (RAG)'];

export const awards = [
  { title: 'Best Performer of the Year', sub: '2023-2024 - BJIT Limited' },
  { title: 'Design Patterns in C# and .NET', sub: '2023 - Udemy certification' },
];

export const education = [
  { title: 'B.Sc. in Computer Science and Engineering', org: 'Bangladesh University of Business and Technology (BUBT)', period: '2018 - 2022' },
  { title: 'Diploma in Computer Technology', org: 'Saic Institute of Management & Technology (SIMT)', period: '2014 - 2018' },
];

// angle = degrees around the loop road (0 = spawn side). onRoad props sit on the road itself.
export const stations = [
  {
    id: 'recharge', build: 'recharge', angle: 28, color: '#ffb347',
    title: 'Global Mobile Recharge Solution', org: 'Tiger Park Limited', role: 'Programmer', period: 'Feb 2018 - Mar 2019',
    scope: ['ASP.NET MVC', 'MS SQL'],
    bullets: ['Developed a global mobile recharge platform integrating 23 third-party APIs.', 'Implemented multi-currency transaction handling for international recharge operations.'],
    outcome: 'Delivered a global recharge platform supporting multi-currency mobile top-ups.',
    hint: '23 satellites orbit the tower - one per third-party API.',
  },
  {
    id: 'wasa', build: 'gate', angle: 52, color: '#4de3d0',
    title: 'WASA Visitor Management System & Web Portal', org: 'Tiger Park Limited', role: 'Programmer', period: 'Apr 2019 - Jul 2019', team: '2 engineers',
    scope: ['WPF', 'MS SQL', 'Django', 'PostgreSQL', 'Django REST Framework'],
    bullets: ['Built the desktop visitor-management client in WPF, integrated with hardware-based check-in features.', 'Built the companion web portal in Django with a PostgreSQL backend.'],
    outcome: 'Delivered a combined desktop and web visitor management system integrating hardware and cloud-side components.',
    hint: 'Boom barrier lifts as you approach, like the real check-in gate.',
  },
  {
    id: 'ecom', build: 'shop', angle: 76, color: '#ff7ab6',
    title: 'Transcom Digital Ecommerce', org: 'Tiger Park Limited', role: 'Developer', period: 'Aug 2019 - Feb 2020', team: '3 engineers',
    scope: ['NopCommerce', 'ASP.NET', 'MS SQL'],
    bullets: ['Contributed to backend API and database integration for an e-commerce platform.', 'Worked within a 3-engineer team on the platform backend systems.'],
    outcome: 'Delivered backend API and database integration for a NopCommerce-based e-commerce platform.',
    hint: 'Parcels are physical - go ahead and knock them over.',
  },
  {
    id: 'telepay', build: 'phone', angle: 100, color: '#7cf29a',
    title: 'Telepay - Teletalk Retailer App', org: 'Tiger Park Limited', role: 'Developer', period: 'Jun 2020 - Aug 2020', team: '3 engineers',
    scope: ['Django', 'PostgreSQL'],
    bullets: ['Built retailer-facing features for a mobile operator recharge and retailer management app.', 'Worked with Django and PostgreSQL across a 3-engineer team.'],
    outcome: 'Delivered retailer app features supporting Teletalk\'s retail recharge network.',
    hint: 'Retail recharge network, one top-up at a time.',
  },
  {
    id: 'laxic', build: 'docs', angle: 124, color: '#9d8cff',
    title: 'Laxic - Open-Source OnlyOffice Customization', org: 'Ektai Limited', role: 'Software Engineer', period: 'Oct 2020 - Jan 2021',
    scope: ['OnlyOffice customization', 'AI-assisted automation'],
    bullets: ['Customized and extended the open-source OnlyOffice platform (Laxic) for client requirements.', 'Implemented AI-assisted automation features within the customized platform.'],
    outcome: 'Delivered a customized OnlyOffice-based solution with integrated automation capabilities.',
    hint: 'The floating crystal is the automation layer.',
  },
  {
    id: 'attend', build: 'clock', angle: 148, color: '#ffd166',
    title: 'Employee Attendance & Sales Tracking Portal', org: 'Transcom Electronics Limited', role: 'Software Engineer', period: 'Feb 2022 - May 2022', team: 'Independent full-stack delivery',
    scope: ['ASP.NET MVC', 'MS SQL'],
    bullets: ['Independently developed the full system, including backend and frontend components.', 'Built attendance and sales reporting features using ASP.NET MVC and MS SQL.'],
    outcome: 'Delivered a system tracking employee attendance and sales reports for internal operations.',
    hint: 'Clock = attendance. Bars = sales reports.',
  },
  {
    id: 'erp', build: 'conveyor', angle: 172, color: '#4de3d0',
    title: 'ERP Data Synchronization Service', org: 'Transcom Electronics Limited', role: 'Software Engineer', period: 'Oct 2022 - Dec 2022',
    scope: ['Windows Service', 'WCF', 'ASP.NET Core Web API'],
    bullets: ['Collaborated with a junior developer to design a background service synchronizing ERP data.', 'Automated updates for products, orders, and stock levels between systems.'],
    outcome: 'Delivered an automated ERP data synchronization service reducing manual reconciliation.',
    hint: 'Products, orders and stock ride the belt between systems.',
  },
  {
    id: 'bridge-assets', build: 'bridge', onRoad: true, angle: 196, color: '#ff9f43',
    title: 'Enzan Bridge Assets Management System', org: 'BJIT Limited', role: 'Software Engineer', period: 'Feb 2023 - Apr 2023', team: '16 engineers',
    scope: ['ASP.NET', 'C#', 'Kotlin'],
    bullets: ['Built backend services integrating web (ASP.NET) and mobile (Kotlin) components for bridge asset tracking.', 'Collaborated within a 16-engineer team to deliver cross-platform asset management features.'],
    outcome: 'Delivered an integrated web and mobile asset-management system for bridge infrastructure.',
    hint: 'Drive across the bridge.',
  },
  {
    id: 'bridge-inspect', build: 'inspect', angle: 220, color: '#4de3d0',
    title: 'Enzan Bridge Inspection System', org: 'BJIT Limited', role: 'Senior Software Engineer', period: 'Oct 2023 - Dec 2023', team: '5 engineers',
    scope: ['C#', '.NET', 'WinForms'],
    bullets: ['Developed a WinForms-based bridge inspection system for civil engineering asset management.', 'Implemented data capture and reporting workflows integrated with MS SQL Server.'],
    outcome: 'Delivered an inspection management tool supporting bridge maintenance operations.',
    hint: 'A scanner sweeps a model bridge.',
  },
  {
    id: 'meter', build: 'meter', angle: 244, color: '#ffd166',
    title: 'Meter Reading Application & Admin Panel', org: 'BJIT Limited', role: 'Senior Software Engineer', period: 'Apr 2024 - Feb 2025', team: '46 engineers',
    scope: ['Microservices', 'ASP.NET Core Web API', 'Ocelot API Gateway', 'Serilog', 'Minio', 'SignalR', 'EF Core', 'AutoMapper', 'JWT'],
    bullets: ['Led backend API development, implementing RESTful services secured with JWT and Ocelot API Gateway.', 'Built real-time features with SignalR and centralized logging with Serilog, handling data with EF Core and AutoMapper.', 'Communicated with clients on requirement clarification and sync meetings across a large cross-functional team.'],
    outcome: 'Delivered a scalable microservices backend and admin panel for enterprise meter-reading operations.',
    hint: '46 tiny engineers surround the meter. Pass the Ocelot gateway first.',
  },
  {
    id: 'fbsc', build: 'torii', angle: 268, color: '#ff5d5d',
    title: 'FBSC OneTech Labo - Enterprise Backend Platform', org: 'BJIT Limited', role: 'Senior Software Engineer', period: 'Mar 2025 - Present', team: '5 engineers',
    scope: ['ASP.NET Core Web API', 'MS SQL Server', 'SSIS'],
    bullets: ['Developing the ASP.NET Core web application backend for a Japanese enterprise client, communicating directly on requirement clarification and sync meetings.', 'Designed MS SQL Server schemas and SSIS packages for data integration and ETL workflows between enterprise systems.', 'Collaborating within a 5-engineer team through Agile sprints and code reviews.'],
    outcome: 'Delivering a reliable ASP.NET Core backend with automated SSIS-driven data pipelines for the client\'s enterprise operations.',
    hint: 'Japanese client, SSIS pipelines between the databases.',
  },
];

// Hubs inside the ring (not on the timeline road)
export const hubs = {
  about: { id: 'about', title: 'Hello, I\'m Zahid', kind: 'about', color: '#4de3d0' },
  skills: { id: 'skills', title: 'Skills Matrix', kind: 'skills', color: '#4de3d0' },
  awards: { id: 'awards', title: 'Awards & Certifications', kind: 'awards', color: '#ffd166' },
  lab: { id: 'lab', title: 'Currently Exploring', kind: 'lab', color: '#9d8cff' },
  edu: { id: 'edu', title: 'Education', kind: 'edu', color: '#ff7ab6' },
  contact: { id: 'contact', title: 'Get in touch', kind: 'contact', color: '#ffb347' },
};
