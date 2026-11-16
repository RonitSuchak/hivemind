// A hand-made, unofficial and possibly incomplete index of topic names from real exam programmes (UK and
// international), used only so a student can search and pick their own course, by name or by exam code.
// These lists were not copied from any exam board and may be grouped differently from the board's own
// documents. Names are short plain headings, never specification text. Codes are the usual specification
// or syllabus codes; check them against your own exam board's documents.
//   short:  the programme's short label, also typed into the box to list its topics.
//   code:   the specification or syllabus code (IB has no numeric code, so it uses a short one like "IB MAA").
//   codes:  other codes that point at the same course (for example the AS level code).
//   region: 'UK' or 'International'.
const P = (id, short, board, level, subject, title, code, units, codes = []) => ({ id, short, board, level, subject, title, code, codes, region: 'UK', units })
// International programmes (Cambridge, Pearson Edexcel International, IB).
const I = (...a) => ({ ...P(...a), region: 'International' })
const U = (name, topics) => ({ name, topics })

// Units shared by the Edexcel, AQA and OCR GCSE Maths entries (the content is set nationally).
const GCSE_MATHS_UNITS = [
    U('Number', [
      'Integers and place value', 'Decimals', 'Fractions', 'Percentages', 'Powers and roots', 'Standard form',
      'Rounding and estimation', 'Factors, multiples and primes', 'Highest common factor and lowest common multiple', 'Prime factors',
      'Surds', 'Recurring decimals', 'Bounds', 'Laws of indices', 'Negative numbers', 'Order of operations',
    ]),
    U('Algebra', [
      'Algebraic notation', 'Substitution', 'Expanding brackets', 'Factorising', 'Solving linear equations',
      'Changing the subject of a formula', 'Simultaneous equations', 'Inequalities', 'Sequences', 'The nth term',
      'Quadratic sequences', 'Solving quadratic equations', 'Completing the square', 'Algebraic fractions',
      'Straight line graphs', 'Gradient', 'Quadratic graphs', 'Cubic and reciprocal graphs', 'Graph transformations',
      'Real life graphs', 'Distance time graphs', 'Equation of a circle', 'Iteration', 'Functions', 'Algebraic proof',
    ]),
    U('Ratio and proportion', [
      'Ratio notation', 'Sharing a quantity in a ratio', 'Direct proportion', 'Inverse proportion',
      'Compound measures', 'Speed, distance and time', 'Density', 'Percentage change', 'Reverse percentages',
      'Compound interest', 'Growth and decay', 'Best buys', 'Unit conversions',
    ]),
    U('Geometry and measures', [
      'Angles in parallel lines', 'Angles in polygons', 'Congruent triangles', 'Similar shapes',
      'Pythagoras\' theorem', 'Trigonometry in right-angled triangles', 'Exact trigonometric values',
      'Sine and cosine rules', 'Area of a triangle using sine', 'Circle theorems', 'Arcs and sectors',
      'Perimeter and area', 'Circumference and area of circles', 'Volume and surface area', 'Cones, spheres and pyramids',
      'Reflections', 'Rotations', 'Translations', 'Enlargements', 'Constructions', 'Loci', 'Bearings', 'Vectors', 'Plans and elevations',
    ]),
    U('Probability', [
      'Probability scale', 'Relative frequency', 'Expected outcomes', 'Sample space diagrams', 'Mutually exclusive events',
      'Tree diagrams', 'Venn diagrams', 'Set notation', 'Independent events', 'Conditional probability',
    ]),
    U('Statistics', [
      'Averages', 'Mean from a frequency table', 'Pie charts', 'Stem and leaf diagrams', 'Frequency polygons', 'Two-way tables',
      'Scatter graphs', 'Correlation', 'Line of best fit', 'Histograms', 'Cumulative frequency', 'Box plots',
      'Sampling', 'Capture recapture',
    ]),
]
const gcseMathsUnits = (ratioName) => GCSE_MATHS_UNITS.map((u) => (u.name === 'Ratio and proportion' ? { ...u, name: ratioName } : u))

// Content shared by the A level Maths entries (AQA, OCR): the headings are set nationally.
const A_MATHS_PURE = ['Proof', 'Algebra and functions', 'Surds and indices', 'Quadratics', 'Simultaneous equations and inequalities', 'Polynomials and the factor theorem', 'Graphs and transformations', 'The modulus function', 'Composite and inverse functions', 'Partial fractions',
  'Coordinate geometry', 'Straight lines', 'Circles', 'Parametric equations', 'Sequences and series', 'Binomial expansion', 'Trigonometry', 'Radians', 'Trigonometric identities', 'Exponentials and logarithms',
  'Differentiation', 'Chain, product and quotient rules', 'Stationary points', 'Integration', 'Integration by parts and substitution', 'Differential equations', 'Numerical methods', 'Vectors']
const A_MATHS_STATS = ['Sampling', 'Data presentation and interpretation', 'Measures of location and spread', 'Correlation and regression', 'Probability', 'Conditional probability', 'Binomial distribution', 'Normal distribution', 'Hypothesis testing']
const A_MATHS_MECH = ['Quantities and units in mechanics', 'Kinematics', 'Constant acceleration', 'Variable acceleration', 'Projectiles', 'Forces and Newton\'s laws', 'Friction', 'Connected particles', 'Moments']

export const PROGRAMMES = [
  P('edexcel-a-further-maths', 'Edexcel A level Further Maths', 'Pearson Edexcel', 'A level', 'Maths', 'Pearson Edexcel A level Further Mathematics', '9FM0', [
    U('Core Pure 1', [
      'Proof by induction', 'Induction with series', 'Induction with divisibility', 'Induction with matrices',
      'Complex numbers', 'Complex conjugates', 'Quadratics with complex roots', 'Argand diagrams', 'Modulus and argument', 'Loci in the Argand diagram', 'Regions in the Argand diagram',
      'Series', 'Sums of natural numbers', 'Sums of squares and cubes',
      'Roots of polynomials', 'Roots of quadratic equations', 'Roots of cubic equations', 'Roots of quartic equations', 'Complex roots of polynomials', 'Equations with related roots',
      'Volumes of revolution about the x-axis', 'Volumes of revolution about the y-axis',
      'Matrices', 'Matrix multiplication', 'Determinants', 'Inverse matrices',
      'Linear transformations', 'Rotations and reflections', 'Enlargements and stretches', 'Successive transformations', 'Invariant points and lines', 'Determinants and area scale factor',
      'Vectors', 'Vector equations of lines', 'Scalar product', 'Vector product', 'Vector equations of planes',
    ]),
    U('Core Pure 2', [
      'de Moivre\'s theorem', 'Trigonometric identities with de Moivre', 'Roots of complex numbers', 'Roots of unity', 'Exponential form of complex numbers', 'Complex numbers in geometry',
      'Method of differences', 'Maclaurin series',
      'Methods in calculus', 'Improper integrals', 'Mean value of a function', 'Differentiating inverse trigonometric functions', 'Integrating with inverse trigonometric functions',
      'Volumes of revolution with parametric curves', 'Modelling with volumes of revolution',
      'Polar coordinates', 'Polar curves', 'Converting polar and Cartesian equations', 'Area enclosed by a polar curve',
      'Hyperbolic functions', 'Hyperbolic identities', 'Inverse hyperbolic functions', 'Differentiating hyperbolic functions', 'Integrating hyperbolic functions',
      'First-order differential equations', 'Integrating factor method', 'Second-order differential equations', 'Complementary function and particular integral', 'Simple harmonic motion', 'Coupled differential equations', 'Modelling with differential equations',
    ]),
    U('Further Pure 1', [
      'Coordinate systems', 'Parabolas', 'Ellipses', 'Hyperbolas', 'Inequalities', 'Further trigonometry', 'Further calculus', 'Further differential equations', 'Further numerical methods',
    ]),
    U('Further Statistics 1', [
      'Discrete probability distributions', 'Expected value and variance of discrete distributions',
      'Poisson distribution', 'Geometric distribution', 'Negative binomial distribution',
      'Hypothesis testing', 'Hypothesis tests for Poisson distributions', 'Hypothesis tests for the geometric distribution',
      'Central limit theorem', 'Chi-squared tests', 'Goodness of fit tests', 'Contingency tables',
      'Probability generating functions', 'Quality of tests', 'Type I and type II errors', 'Power of a test',
    ]),
    U('Further Mechanics 1', [
      'Momentum and impulse', 'Conservation of momentum', 'Work, energy and power', 'Kinetic and potential energy',
      'Elastic strings and springs', 'Hooke\'s law', 'Elastic potential energy',
      'Elastic collisions in one dimension', 'Coefficient of restitution', 'Elastic collisions in two dimensions', 'Collisions with a fixed surface',
    ]),
    U('Decision 1', [
      'Algorithms', 'Flow charts for algorithms', 'Bubble sort', 'Quick sort', 'Binary search', 'Bin packing',
      'Graphs and networks', 'Kruskal\'s algorithm', 'Prim\'s algorithm', 'Dijkstra\'s algorithm',
      'Route inspection', 'Travelling salesperson problem',
      'Critical path analysis', 'Activity networks', 'Scheduling and cascade charts',
      'Linear programming', 'Formulating linear programs', 'Graphical linear programming',
    ]),
  ]),

  P('edexcel-a-maths', 'Edexcel A level Maths', 'Pearson Edexcel', 'A level', 'Maths', 'Pearson Edexcel A level Mathematics', '9MA0', [
    U('Pure Year 1', [
      'Algebraic expressions', 'Indices and surds', 'Expanding brackets', 'Factorising',
      'Quadratics', 'Completing the square', 'The discriminant', 'Quadratic inequalities',
      'Equations and inequalities', 'Simultaneous equations', 'Linear inequalities',
      'Graphs and transformations', 'Sketching cubic graphs', 'Reciprocal graphs', 'Transformations of graphs',
      'Straight line graphs', 'Equation of a straight line', 'Parallel and perpendicular lines',
      'Circles', 'Equation of a circle', 'Circle geometry',
      'Algebraic methods', 'Algebraic division', 'Factor theorem', 'Proof by deduction', 'Proof by exhaustion',
      'The binomial expansion', 'Pascal\'s triangle', 'Binomial coefficients',
      'Trigonometric ratios', 'Sine and cosine rules', 'Area of a triangle using sine', 'Exact trigonometric values',
      'Trigonometric identities and equations', 'Solving trigonometric equations',
      'Vectors', 'Magnitude and direction of vectors', 'Vectors in geometry',
      'Differentiation', 'Gradient of a curve', 'Tangents and normals', 'Stationary points',
      'Integration', 'Definite integrals', 'Area under a curve',
      'Exponentials and logarithms', 'Exponential functions', 'Laws of logarithms', 'Exponential modelling',
    ]),
    U('Pure Year 2', [
      'Proof by contradiction', 'Partial fractions', 'Algebraic fractions',
      'Functions and graphs', 'The modulus function', 'Composite functions', 'Inverse functions',
      'Sequences and series', 'Arithmetic sequences', 'Geometric sequences', 'Sigma notation', 'Recurrence relations',
      'Binomial expansion for any power',
      'Radians', 'Arc length and sector area', 'Small angle approximations',
      'Trigonometric functions', 'Secant, cosecant and cotangent', 'Inverse trigonometric functions',
      'Trigonometry and modelling', 'Addition formulae', 'Double angle formulae', 'R cos theta form',
      'Parametric equations',
      'Chain rule', 'Product rule', 'Quotient rule', 'Implicit differentiation', 'Connected rates of change',
      'Numerical methods', 'Locating roots', 'Newton-Raphson method', 'Iteration',
      'Integration by substitution', 'Integration by parts', 'Trapezium rule', 'Separable differential equations',
      'Vectors in three dimensions',
    ]),
    U('Statistics', [
      'Data collection', 'Sampling', 'Large data set', 'Measures of location and spread', 'Outliers',
      'Representations of data', 'Histograms', 'Box plots', 'Cumulative frequency',
      'Correlation', 'Scatter diagrams', 'Regression lines', 'Product moment correlation coefficient',
      'Probability', 'Venn diagrams', 'Conditional probability', 'Tree diagrams',
      'Statistical distributions', 'Binomial distribution', 'Normal distribution',
      'Hypothesis testing', 'Hypothesis tests for the binomial distribution', 'Hypothesis tests for correlation',
    ]),
    U('Mechanics', [
      'Modelling in mechanics', 'Modelling assumptions',
      'Constant acceleration', 'Velocity time graphs', 'Vertical motion under gravity',
      'Forces and motion', 'Newton\'s laws of motion', 'Connected particles', 'Pulleys',
      'Variable acceleration', 'Differentiating and integrating in kinematics',
      'Moments', 'Forces and friction', 'Resolving forces', 'Motion on an inclined plane',
      'Projectiles', 'Applications of forces', 'Vectors in kinematics',
    ]),
  ]),

  P('edexcel-gcse-maths', 'Edexcel GCSE Maths', 'Pearson Edexcel', 'GCSE', 'Maths', 'Pearson Edexcel GCSE (9-1) Mathematics', '1MA1', gcseMathsUnits('Ratio and proportion')),

  P('ocr-a-physics-a', 'OCR A level Physics', 'OCR', 'A level', 'Science', 'OCR A level Physics A', 'H556', [
    U('Module 2 Foundations of physics', [
      'Physical quantities and units', 'SI units', 'Scalars and vectors', 'Making measurements', 'Uncertainties and errors', 'Analysing data',
    ]),
    U('Module 3 Forces and motion', [
      'Motion', 'Displacement, velocity and acceleration', 'Equations of motion', 'Projectile motion', 'Free fall',
      'Forces in action', 'Moments and couples', 'Centre of mass', 'Drag and terminal velocity', 'Density', 'Pressure',
      'Work, energy and power', 'Conservation of energy', 'Efficiency',
      'Materials', 'Hooke\'s law', 'Stress and strain', 'Young modulus',
      'Newton\'s laws of motion', 'Momentum', 'Impulse', 'Collisions',
    ]),
    U('Module 4 Electrons, waves and photons', [
      'Electric current', 'Potential difference', 'Resistance', 'Resistivity', 'Current voltage characteristics', 'Electrical power',
      'Series and parallel circuits', 'Kirchhoff\'s laws', 'EMF and internal resistance', 'Potential dividers',
      'Progressive waves', 'Wave speed and frequency', 'Superposition', 'Stationary waves', 'Diffraction', 'Interference', 'Polarisation', 'Refraction',
      'Photons', 'Photoelectric effect', 'Wave particle duality', 'Line spectra', 'Energy levels',
    ]),
    U('Module 5 Newtonian world and astrophysics', [
      'Thermal physics', 'Specific heat capacity', 'Specific latent heat', 'Internal energy', 'Ideal gases', 'Kinetic theory of gases', 'Absolute zero',
      'Circular motion', 'Centripetal force',
      'Oscillations', 'Simple harmonic motion', 'Free and forced oscillations', 'Resonance and damping',
      'Gravitational fields', 'Gravitational potential', 'Orbits of satellites', 'Kepler\'s laws',
      'Astrophysics and cosmology', 'Stellar life cycle', 'Hertzsprung-Russell diagram', 'Standard candles', 'Doppler effect and redshift', 'Hubble\'s law', 'The Big Bang',
    ]),
    U('Module 6 Particles and medical physics', [
      'Capacitors', 'Charging and discharging capacitors', 'Energy stored in a capacitor',
      'Electric fields', 'Coulomb\'s law', 'Magnetic fields', 'Electromagnetic induction', 'Faraday\'s law', 'Transformers',
      'Atomic structure', 'Radioactive decay', 'Half-life', 'Binding energy', 'Nuclear fission and fusion', 'Fundamental particles', 'Quarks and leptons',
      'Medical imaging', 'X-rays', 'Ultrasound', 'MRI scans', 'PET scans', 'Gamma camera',
    ]),
  ]),

  P('edexcel-a-economics-a', 'Edexcel A level Economics', 'Pearson Edexcel', 'A level', 'Economics', 'Pearson Edexcel A level Economics A', '9EC0', [
    U('Theme 1 Markets and market failure', [
      'Scarcity and choice', 'Opportunity cost', 'Production possibility frontiers', 'Economic systems',
      'Demand', 'Supply', 'Market equilibrium', 'Price elasticity of demand', 'Price elasticity of supply', 'Income elasticity of demand', 'Cross elasticity of demand',
      'Consumer and producer surplus', 'Price mechanism', 'Behavioural economics',
      'Externalities', 'Public goods', 'Merit and demerit goods', 'Information failure',
      'Indirect taxes and subsidies', 'Price controls', 'Government failure',
    ]),
    U('Theme 2 The UK economy', [
      'Economic growth', 'Gross domestic product', 'Inflation', 'Unemployment', 'Balance of payments', 'Circular flow of income',
      'Aggregate demand', 'Aggregate supply', 'The multiplier', 'Economic cycle',
      'Fiscal policy', 'Monetary policy', 'Supply-side policies', 'Exchange rates', 'Phillips curve',
    ]),
    U('Theme 3 Business behaviour and the labour market', [
      'Business growth', 'Business objectives', 'Revenue, costs and profit', 'Economies of scale',
      'Perfect competition', 'Monopoly', 'Oligopoly', 'Monopolistic competition', 'Contestable markets', 'Price discrimination',
      'Labour demand and supply', 'Wage determination', 'Monopsony', 'Minimum wage',
      'Privatisation', 'Competition policy', 'Regulation',
    ]),
    U('Theme 4 A global perspective', [
      'Globalisation', 'International trade', 'Comparative advantage', 'Terms of trade', 'Protectionism', 'Trading blocs',
      'Measures of development', 'Human development index', 'Poverty and inequality', 'Barriers to growth and development',
      'Financial markets', 'Central banks', 'Role of the state',
    ]),
  ], ['8EC0']),

  P('aqa-gcse-combined-science', 'AQA GCSE Combined Science', 'AQA', 'GCSE', 'Science', 'AQA GCSE Combined Science: Trilogy', '8464', [
    U('Biology', [
      'Cell biology', 'Eukaryotic and prokaryotic cells', 'Cell division', 'Stem cells', 'Transport in cells',
      'Organisation', 'Digestive system', 'Enzymes', 'Heart and blood vessels', 'Plant tissues',
      'Infection and response', 'Communicable diseases', 'Vaccination', 'Antibiotics',
      'Bioenergetics', 'Photosynthesis', 'Respiration',
      'Homeostasis and response', 'Nervous system', 'Hormones', 'Diabetes',
      'Inheritance, variation and evolution', 'Reproduction', 'DNA and genes', 'Genetic inheritance', 'Natural selection', 'Selective breeding',
      'Ecology', 'Ecosystems and food webs', 'Biodiversity', 'Carbon cycle',
    ]),
    U('Chemistry', [
      'Atomic structure and the periodic table', 'Atoms and isotopes', 'The periodic table',
      'Bonding, structure and properties of matter', 'Ionic bonding', 'Covalent bonding', 'Metallic bonding',
      'Quantitative chemistry', 'Relative formula mass', 'Moles',
      'Chemical changes', 'Reactivity series', 'Acids and alkalis', 'Electrolysis',
      'Energy changes', 'Exothermic and endothermic reactions',
      'The rate and extent of chemical change', 'Rates of reaction', 'Reversible reactions and equilibrium',
      'Organic chemistry', 'Crude oil and hydrocarbons', 'Cracking',
      'Chemical analysis', 'Chromatography', 'Chemistry of the atmosphere', 'Greenhouse gases', 'Using resources', 'Life cycle assessment',
    ]),
    U('Physics', [
      'Energy', 'Energy stores and transfers', 'Specific heat capacity', 'Power',
      'Electricity', 'Circuits', 'Mains electricity',
      'Particle model of matter', 'Density', 'Changes of state',
      'Atomic structure', 'Radioactive decay', 'Half-life',
      'Forces', 'Speed, distance and time', 'Resultant forces', 'Newton\'s laws of motion', 'Momentum',
      'Waves', 'Electromagnetic spectrum',
      'Magnetism and electromagnetism', 'Electromagnets',
    ]),
  ]),

  P('aqa-gcse-computer-science', 'AQA GCSE Computer Science', 'AQA', 'GCSE', 'Computing', 'AQA GCSE Computer Science', '8525', [
    U('Fundamentals of algorithms', [
      'Decomposition', 'Abstraction', 'Algorithms', 'Pseudocode', 'Flowcharts', 'Trace tables',
      'Linear search', 'Binary search', 'Bubble sort', 'Merge sort',
    ]),
    U('Programming', [
      'Variables and constants', 'Data types', 'Selection', 'Iteration', 'Subroutines', 'Arrays', 'String handling', 'File handling',
      'Random number generation', 'Validation', 'Testing and debugging',
    ]),
    U('Data representation', [
      'Binary', 'Hexadecimal', 'Binary arithmetic', 'Character encoding', 'Representing images', 'Representing sound', 'Data compression',
    ]),
    U('Computer systems', [
      'Boolean logic', 'Logic gates', 'Hardware and software', 'The CPU', 'Fetch decode execute cycle', 'Memory', 'Secondary storage',
      'Operating systems', 'Programming languages and translators',
    ]),
    U('Computer networks', [
      'Local and wide area networks', 'Network topologies', 'Network protocols', 'TCP/IP', 'Wireless networking', 'Encryption',
    ]),
    U('Cyber security', [
      'Social engineering', 'Malware', 'Penetration testing', 'SQL injection', 'Network security',
    ]),
    U('Relational databases and SQL', [
      'Relational databases', 'Primary and foreign keys', 'SQL queries',
    ]),
    U('Ethical, digital and environmental impacts', [
      'Privacy', 'Environmental impact of technology', 'Computer Misuse Act', 'Data Protection Act', 'Copyright', 'Open source software',
    ]),
  ]),

  P('aqa-gcse-english-language', 'AQA GCSE English Language', 'AQA', 'GCSE', 'English', 'AQA GCSE English Language', '8700', [
    U('Paper 1 Creative reading and writing', [
      'Finding information in a text', 'Analysing language', 'Analysing structure', 'Evaluating a text', 'Descriptive writing', 'Narrative writing',
    ]),
    U('Paper 2 Writers\' viewpoints and perspectives', [
      'True or false statements', 'Summarising differences between texts', 'Analysing language in non-fiction', 'Comparing writers\' viewpoints', 'Writing to argue or persuade', 'Writing to inform or explain',
    ]),
  ]),

  // ---------- UK: AQA, OCR and Pearson Edexcel ----------
  P('aqa-a-maths', 'AQA A level Maths', 'AQA', 'A level', 'Maths', 'AQA A level Mathematics', '7357', [
    U('Pure mathematics', A_MATHS_PURE),
    U('Statistics', A_MATHS_STATS),
    U('Mechanics', A_MATHS_MECH),
  ], ['7356']),

  P('ocr-a-maths-a', 'OCR A level Maths', 'OCR', 'A level', 'Maths', 'OCR A level Mathematics A', 'H240', [
    U('Pure mathematics', A_MATHS_PURE),
    U('Statistics', A_MATHS_STATS),
    U('Mechanics', A_MATHS_MECH),
  ], ['H230']),

  P('ocr-a-further-maths-a', 'OCR A level Further Maths', 'OCR', 'A level', 'Maths', 'OCR A level Further Mathematics A', 'H245', [
    U('Pure core', [
      'Proof by induction', 'Complex numbers', 'Roots of unity', 'Matrices and transformations', 'Further algebra and functions', 'Roots of polynomials', 'Series and the method of differences', 'Maclaurin series',
      'Polar coordinates', 'Hyperbolic functions', 'Further calculus', 'Volumes of revolution', 'Differential equations', 'Further vectors', 'Vector equations of lines and planes',
    ]),
    U('Statistics', ['Discrete random variables', 'Continuous random variables', 'Chi-squared tests', 'Hypothesis testing']),
    U('Mechanics', ['Momentum and impulse', 'Collisions', 'Work, energy and power', 'Elastic strings and springs', 'Circular motion', 'Centres of mass']),
  ], ['H235']),

  P('aqa-gcse-maths', 'AQA GCSE Maths', 'AQA', 'GCSE', 'Maths', 'AQA GCSE Mathematics', '8300', gcseMathsUnits('Ratio, proportion and rates of change')),
  P('ocr-gcse-maths', 'OCR GCSE Maths', 'OCR', 'GCSE', 'Maths', 'OCR GCSE (9-1) Mathematics', 'J560', gcseMathsUnits('Ratio, proportion and rates of change')),

  P('aqa-a-physics', 'AQA A level Physics', 'AQA', 'A level', 'Science', 'AQA A level Physics', '7408', [
    U('Measurements and their errors', ['Use of SI units', 'Limitations of physical measurement', 'Estimation of physical quantities']),
    U('Particles and radiation', ['Constituents of the atom', 'Stable and unstable nuclei', 'Particles, antiparticles and photons', 'Particle interactions', 'Classification of particles', 'Quarks and antiquarks', 'Conservation laws', 'The photoelectric effect', 'Energy levels and spectra', 'Wave particle duality']),
    U('Waves', ['Progressive and stationary waves', 'Refraction', 'Diffraction', 'Interference', 'Polarisation', 'Diffraction gratings', 'Total internal reflection']),
    U('Mechanics and materials', ['Scalars and vectors', 'Moments', 'Motion along a straight line', 'Projectile motion', 'Newton\'s laws of motion', 'Momentum', 'Work, energy and power', 'Bulk properties of solids', 'The Young modulus']),
    U('Electricity', ['Current and charge', 'Resistance and resistivity', 'Circuits', 'Potential dividers', 'EMF and internal resistance', 'Alternating currents']),
    U('Further mechanics and thermal physics', ['Circular motion', 'Simple harmonic motion', 'Thermal energy transfer', 'Ideal gases', 'Molecular kinetic theory']),
    U('Fields and their consequences', ['Gravitational fields', 'Electric fields', 'Capacitance', 'Magnetic fields', 'Electromagnetic induction']),
    U('Nuclear physics', ['Radioactivity', 'Nuclear instability', 'Nuclear radius', 'Nuclear fission and fusion', 'Binding energy']),
    U('Options', ['Astrophysics', 'Medical physics', 'Engineering physics', 'Turning points in physics']),
  ], ['7407']),

  P('aqa-a-chemistry', 'AQA A level Chemistry', 'AQA', 'A level', 'Science', 'AQA A level Chemistry', '7405', [
    U('Physical chemistry', ['Atomic structure', 'Amount of substance', 'Bonding', 'Energetics', 'Kinetics', 'Chemical equilibria and Le Chatelier', 'Oxidation, reduction and redox equations', 'Thermodynamics', 'Rate equations', 'Equilibrium constant Kp', 'Electrode potentials and cells', 'Acids and bases']),
    U('Inorganic chemistry', ['Periodicity', 'Group 2, the alkaline earth metals', 'Group 7, the halogens', 'Period 3 elements and oxides', 'Transition metals', 'Reactions of ions in aqueous solution']),
    U('Organic chemistry', ['Introduction to organic chemistry', 'Alkanes', 'Halogenoalkanes', 'Alkenes', 'Alcohols', 'Organic analysis', 'Optical isomerism', 'Aldehydes and ketones', 'Carboxylic acids and derivatives', 'Aromatic chemistry', 'Amines', 'Polymers', 'Amino acids, proteins and DNA', 'Organic synthesis', 'Nuclear magnetic resonance spectroscopy', 'Chromatography']),
  ], ['7404']),

  P('aqa-a-biology', 'AQA A level Biology', 'AQA', 'A level', 'Science', 'AQA A level Biology', '7402', [
    U('Biological molecules', ['Monomers and polymers', 'Carbohydrates', 'Lipids', 'Proteins', 'Enzymes', 'Nucleic acids', 'ATP', 'Water', 'Inorganic ions']),
    U('Cells', ['Cell structure', 'Mitosis and the cell cycle', 'Transport across cell membranes', 'Cell recognition and the immune system']),
    U('Organisms exchange substances with their environment', ['Surface area to volume ratio', 'Gas exchange', 'Digestion and absorption', 'Mass transport in animals', 'Mass transport in plants']),
    U('Genetic information, variation and relationships between organisms', ['DNA, genes and chromosomes', 'DNA and protein synthesis', 'Genetic diversity and mutation', 'Genetic diversity and adaptation', 'Species and taxonomy', 'Biodiversity within a community', 'Investigating diversity']),
    U('Energy transfers in and between organisms', ['Photosynthesis', 'Respiration', 'Energy and ecosystems', 'Nutrient cycles']),
    U('Organisms respond to changes in their environments', ['Stimuli and response', 'Nervous coordination', 'Skeletal muscles', 'Homeostasis']),
    U('Genetics, populations, evolution and ecosystems', ['Inheritance', 'Populations', 'Evolution and speciation', 'Populations in ecosystems']),
    U('The control of gene expression', ['Mutations of DNA', 'Gene expression and cancer', 'Genome projects', 'Gene technologies']),
  ], ['7401']),

  P('ocr-a-chemistry-a', 'OCR A level Chemistry', 'OCR', 'A level', 'Science', 'OCR A level Chemistry A', 'H432', [
    U('Foundations in chemistry', ['Atoms and reactions', 'Electrons, bonding and structure', 'Amount of substance', 'Acids and redox']),
    U('Periodic table and energy', ['The periodic table and periodicity', 'Group 2 and the halogens', 'Qualitative analysis', 'Enthalpy changes', 'Reaction rates and equilibrium']),
    U('Core organic chemistry', ['Basic concepts and hydrocarbons', 'Alcohols and haloalkanes', 'Organic synthesis', 'Analytical techniques']),
    U('Physical chemistry and transition elements', ['Rates, equilibrium and pH', 'Energy and lattice enthalpy', 'Transition elements']),
    U('Organic chemistry and analysis', ['Aromatic compounds', 'Carbonyl compounds', 'Carboxylic acids and esters', 'Nitrogen compounds', 'Polymers', 'Organic synthesis', 'Chromatography and spectroscopy']),
  ], ['H032']),

  P('ocr-a-biology-a', 'OCR A level Biology', 'OCR', 'A level', 'Science', 'OCR A level Biology A', 'H420', [
    U('Foundations in biology', ['Cell structure', 'Biological molecules', 'Nucleotides and nucleic acids', 'Enzymes', 'Biological membranes', 'Cell division, diversity and organisation']),
    U('Exchange and transport', ['Exchange surfaces', 'Transport in animals', 'Transport in plants']),
    U('Biodiversity, evolution and disease', ['Communicable diseases and the immune system', 'Biodiversity', 'Classification and evolution']),
    U('Communication, homeostasis and energy', ['Communication and homeostasis', 'Excretion', 'Neuronal communication', 'Hormonal communication', 'Plant and animal responses', 'Photosynthesis', 'Respiration']),
    U('Genetics, evolution and ecosystems', ['Genetics of living systems', 'Patterns of inheritance', 'Manipulating genomes', 'Cloning and biotechnology', 'Ecosystems', 'Populations and sustainability']),
  ], ['H020']),

  P('edexcel-a-physics', 'Edexcel A level Physics', 'Pearson Edexcel', 'A level', 'Science', 'Pearson Edexcel A level Physics', '9PH0', [
    U('Working as a physicist', ['Planning and analysis', 'Units and uncertainties']),
    U('Mechanics', ['Vectors and scalars', 'Motion', 'Forces', 'Newton\'s laws of motion', 'Work, energy and power', 'Projectile motion']),
    U('Electric circuits', ['Current and potential difference', 'Resistance and resistivity', 'Series and parallel circuits', 'Potential dividers', 'Internal resistance']),
    U('Materials', ['Density', 'Hooke\'s law', 'Stress and strain', 'The Young modulus', 'Fluids and viscosity']),
    U('Waves and the particle nature of light', ['Wave properties', 'Superposition and stationary waves', 'Diffraction', 'Refraction', 'The photoelectric effect', 'Wave particle duality', 'Line spectra']),
    U('Further mechanics', ['Momentum and impulse', 'Circular motion']),
    U('Electric and magnetic fields', ['Electric fields', 'Capacitors', 'Magnetic fields', 'Electromagnetic induction', 'Alternating currents']),
    U('Nuclear radiation', ['Radioactive decay', 'Half-life', 'Nuclear energy', 'Binding energy']),
    U('Thermodynamics', ['Thermal energy', 'Specific heat capacity', 'Specific latent heat', 'Ideal gases', 'Kinetic theory']),
    U('Space', ['Stellar life cycle', 'Hertzsprung-Russell diagram', 'The Doppler effect', 'Cosmology', 'The Big Bang']),
    U('Gravitational fields', ['Newton\'s law of gravitation', 'Gravitational field strength', 'Gravitational potential', 'Orbits of satellites']),
    U('Oscillations', ['Simple harmonic motion', 'Resonance and damping']),
  ], ['8PH0']),

  P('edexcel-a-chemistry', 'Edexcel A level Chemistry', 'Pearson Edexcel', 'A level', 'Science', 'Pearson Edexcel A level Chemistry', '9CH0', [
    U('Physical chemistry', ['Atomic structure and the periodic table', 'Bonding and structure', 'Formulae, equations and amounts of substance', 'Energetics', 'Kinetics', 'Equilibrium', 'Acid-base equilibria', 'Redox', 'Lattice energy and entropy']),
    U('Inorganic chemistry', ['Periodicity', 'Group 2 and Group 7', 'Transition metals']),
    U('Organic chemistry', ['Introduction to organic chemistry', 'Alkanes', 'Alkenes', 'Halogenoalkanes', 'Alcohols', 'Carbonyl compounds', 'Carboxylic acids and esters', 'Aromatic compounds', 'Amines', 'Polymers', 'Amino acids and proteins', 'Organic synthesis']),
    U('Analytical techniques', ['Mass spectrometry', 'Infrared spectroscopy', 'NMR spectroscopy', 'Chromatography']),
  ], ['8CH0']),

  P('aqa-gcse-biology', 'AQA GCSE Biology', 'AQA', 'GCSE', 'Science', 'AQA GCSE Biology', '8461', [
    U('Cell biology', ['Cell structure', 'Cell division', 'Cell differentiation', 'Stem cells', 'Transport in cells', 'Microscopy']),
    U('Organisation', ['Principles of organisation', 'The digestive system', 'Enzymes', 'The heart and blood vessels', 'Health and disease', 'Plant tissues and transport']),
    U('Infection and response', ['Communicable diseases', 'Preventing and treating disease', 'Vaccination', 'Antibiotics', 'Monoclonal antibodies', 'Plant disease']),
    U('Bioenergetics', ['Photosynthesis', 'Respiration', 'Metabolism']),
    U('Homeostasis and response', ['The nervous system', 'Hormonal coordination', 'Blood glucose and diabetes', 'Hormones in human reproduction', 'Plant hormones']),
    U('Inheritance, variation and evolution', ['Sexual and asexual reproduction', 'Meiosis', 'DNA and the genome', 'Genetic inheritance', 'Variation and evolution', 'Selective breeding and genetic engineering', 'Classification']),
    U('Ecology', ['Adaptations and competition', 'Organisation of an ecosystem', 'Cycling of materials', 'Biodiversity and ecosystems', 'Trophic levels', 'Food security']),
  ]),

  P('aqa-gcse-chemistry', 'AQA GCSE Chemistry', 'AQA', 'GCSE', 'Science', 'AQA GCSE Chemistry', '8462', [
    U('Atomic structure and the periodic table', ['Atoms, elements and compounds', 'Mixtures and separation', 'Models of the atom', 'The periodic table', 'Groups 0, 1 and 7', 'Transition metals']),
    U('Bonding, structure and properties of matter', ['Chemical bonds', 'Ionic bonding', 'Covalent bonding', 'Metallic bonding', 'States of matter', 'Giant structures and polymers', 'Nanoparticles']),
    U('Quantitative chemistry', ['Conservation of mass', 'Relative formula mass', 'The mole', 'Limiting reactants', 'Concentration of solutions', 'Percentage yield and atom economy']),
    U('Chemical changes', ['Reactivity of metals', 'Reactions of acids', 'Making salts', 'The pH scale and neutralisation', 'Electrolysis', 'Extracting metals']),
    U('Energy changes', ['Exothermic and endothermic reactions', 'Reaction profiles', 'Bond energies', 'Cells and batteries']),
    U('The rate and extent of chemical change', ['Rate of reaction', 'Catalysts', 'Reversible reactions', 'Dynamic equilibrium']),
    U('Organic chemistry', ['Crude oil and hydrocarbons', 'Fractional distillation', 'Cracking', 'Alkenes', 'Alcohols and carboxylic acids', 'Polymers']),
    U('Chemical analysis', ['Pure substances and formulations', 'Chromatography', 'Tests for gases', 'Tests for ions']),
    U('Chemistry of the atmosphere', ['The atmosphere over time', 'Greenhouse gases', 'Climate change', 'Atmospheric pollutants']),
    U('Using resources', ['Using the Earth\'s resources', 'Potable water', 'Life cycle assessment', 'Recycling', 'The Haber process', 'Fertilisers']),
  ]),

  P('aqa-gcse-physics', 'AQA GCSE Physics', 'AQA', 'GCSE', 'Science', 'AQA GCSE Physics', '8463', [
    U('Energy', ['Energy stores and transfers', 'Changes in energy', 'Conservation and dissipation of energy', 'National and global energy resources']),
    U('Electricity', ['Current and charge', 'Series and parallel circuits', 'Domestic uses and safety', 'Energy transfers', 'Static electricity']),
    U('Particle model of matter', ['Density', 'Changes of state', 'Internal energy', 'Specific latent heat', 'Particle motion in gases']),
    U('Atomic structure', ['The structure of an atom', 'Radioactive decay and nuclear radiation', 'Half-life', 'Uses and dangers of radiation', 'Nuclear fission and fusion']),
    U('Forces', ['Forces and their interactions', 'Work done and energy transfer', 'Forces and elasticity', 'Moments, levers and gears', 'Pressure in fluids', 'Speed and velocity', 'Acceleration', 'Newton\'s laws of motion', 'Stopping distance', 'Momentum']),
    U('Waves', ['Transverse and longitudinal waves', 'Properties of waves', 'Electromagnetic waves', 'Reflection and refraction', 'Sound waves', 'Lenses', 'Black body radiation']),
    U('Magnetism and electromagnetism', ['Permanent and induced magnets', 'Magnetic fields', 'The motor effect', 'Electromagnetic induction', 'Transformers']),
    U('Space physics', ['The solar system and stars', 'Life cycle of a star', 'Orbital motion', 'Red-shift']),
  ]),

  P('ocr-gcse-computer-science', 'OCR GCSE Computer Science', 'OCR', 'GCSE', 'Computing', 'OCR GCSE (9-1) Computer Science', 'J277', [
    U('Computer systems', ['Systems architecture', 'Memory and storage', 'Computer networks, connections and protocols', 'Network security', 'Systems software', 'Ethical, legal, cultural and environmental impacts']),
    U('Computational thinking, algorithms and programming', ['Algorithms', 'Programming fundamentals', 'Producing robust programs', 'Boolean logic', 'Programming languages and IDEs']),
  ]),

  P('aqa-a-economics', 'AQA A level Economics', 'AQA', 'A level', 'Economics', 'AQA A level Economics', '7136', [
    U('Individuals, firms, markets and market failure', [
      'Economic methodology and the economic problem', 'Individual economic decision making', 'Price determination in a competitive market', 'Production, costs and revenue',
      'Competitive and concentrated markets', 'The labour market', 'Poverty and inequality', 'The market mechanism and market failure', 'Government intervention',
    ]),
    U('The national and international economy', [
      'Measuring macroeconomic performance', 'The circular flow of income', 'Aggregate demand and aggregate supply', 'Economic performance',
      'Financial markets and monetary policy', 'Fiscal policy and supply-side policies', 'The international economy',
    ]),
  ], ['7135']),

  // ---------- International: Cambridge, Pearson Edexcel International and the IB ----------
  I('cie-igcse-maths', 'Cambridge IGCSE Maths', 'Cambridge', 'IGCSE', 'Maths', 'Cambridge IGCSE Mathematics', '0580', [
    U('Number', ['Types of number', 'Sets', 'Powers and roots', 'Fractions, decimals and percentages', 'The four operations', 'Indices', 'Standard form', 'Estimation and limits of accuracy', 'Ratio and proportion', 'Percentages', 'Time and money', 'Exponential growth and decay', 'Surds']),
    U('Algebra and graphs', ['Algebraic manipulation', 'Expressions and formulae', 'Linear equations', 'Quadratic equations', 'Simultaneous equations', 'Inequalities', 'Sequences', 'Proportion', 'Graphs of functions', 'Functions', 'Differentiation']),
    U('Coordinate geometry', ['Straight line graphs', 'Midpoints and lengths of lines']),
    U('Geometry', ['Geometrical terms', 'Scale drawings', 'Similarity', 'Symmetry', 'Angle properties', 'Circle theorems', 'Constructions']),
    U('Mensuration', ['Areas and perimeters', 'Circles, arcs and sectors', 'Surface areas and volumes', 'Compound shapes']),
    U('Trigonometry', ['Bearings', 'Right-angled triangles', 'Sine and cosine rules', 'Graphs of trigonometric functions', 'Three-dimensional problems']),
    U('Transformations and vectors', ['Transformations', 'Vectors']),
    U('Probability', ['Introduction to probability', 'Relative and expected frequency', 'Probability of combined events']),
    U('Statistics', ['Classifying statistical data', 'Interpreting statistical data', 'Averages and measures of spread', 'Statistical charts and diagrams', 'Scatter diagrams', 'Histograms', 'Cumulative frequency']),
  ]),

  I('cie-igcse-physics', 'Cambridge IGCSE Physics', 'Cambridge', 'IGCSE', 'Science', 'Cambridge IGCSE Physics', '0625', [
    U('Motion, forces and energy', ['Physical quantities and measurement', 'Motion', 'Mass and weight', 'Density', 'Effects of forces', 'Momentum', 'Energy, work and power', 'Pressure']),
    U('Thermal physics', ['Kinetic particle model of matter', 'Thermal properties and temperature', 'Transfer of thermal energy']),
    U('Waves', ['General properties of waves', 'Light', 'Electromagnetic spectrum', 'Sound']),
    U('Electricity and magnetism', ['Simple phenomena of magnetism', 'Electrical quantities', 'Electric circuits', 'Electrical safety', 'Electromagnetic effects']),
    U('Nuclear physics', ['The nuclear model of the atom', 'Radioactivity']),
    U('Space physics', ['Earth and the Solar System', 'Stars and the Universe']),
  ]),

  I('cie-igcse-chemistry', 'Cambridge IGCSE Chemistry', 'Cambridge', 'IGCSE', 'Science', 'Cambridge IGCSE Chemistry', '0620', [
    U('States of matter', ['Solids, liquids and gases', 'Diffusion']),
    U('Atoms, elements and compounds', ['Elements, compounds and mixtures', 'Atomic structure and the Periodic Table', 'Isotopes', 'Ions and ionic bonds', 'Simple molecules and covalent bonds', 'Giant covalent structures']),
    U('Stoichiometry', ['Formulae', 'Relative masses of atoms and molecules', 'The mole and the Avogadro constant']),
    U('Electrochemistry', ['Electrolysis', 'Hydrogen-oxygen fuel cells']),
    U('Chemical energetics', ['Exothermic and endothermic reactions']),
    U('Chemical reactions', ['Physical and chemical changes', 'Rate of reaction', 'Reversible reactions and equilibrium', 'Redox']),
    U('Acids, bases and salts', ['Properties of acids and bases', 'Types of oxides', 'Preparation of salts']),
    U('The Periodic Table', ['Periodic trends', 'Group properties', 'Transition elements', 'Noble gases']),
    U('Metals', ['Properties of metals', 'Reactivity series', 'Extraction of metals', 'Uses of metals', 'Alloys']),
    U('Chemistry of the environment', ['Water', 'Fertilisers', 'Air quality and climate']),
    U('Organic chemistry', ['Formulae, functional groups and terminology', 'Homologous series', 'Fuels', 'Alkanes', 'Alkenes', 'Alcohols', 'Carboxylic acids', 'Polymers']),
    U('Experimental techniques and chemical analysis', ['Experimental design', 'Acid-base titrations', 'Chromatography', 'Separation and purification', 'Identification of ions and gases']),
  ]),

  I('cie-igcse-biology', 'Cambridge IGCSE Biology', 'Cambridge', 'IGCSE', 'Science', 'Cambridge IGCSE Biology', '0610', [
    U('Syllabus topics', [
      'Characteristics and classification of living organisms', 'Organisation of the organism', 'Movement into and out of cells', 'Biological molecules', 'Enzymes', 'Plant nutrition', 'Human nutrition',
      'Transport in plants', 'Transport in animals', 'Diseases and immunity', 'Gas exchange in humans', 'Respiration', 'Excretion in humans', 'Coordination and response', 'Drugs',
      'Reproduction', 'Inheritance', 'Variation and selection', 'Organisms and their environment', 'Human influences on ecosystems', 'Biotechnology and genetic modification',
    ]),
  ]),

  I('cie-igcse-computer-science', 'Cambridge IGCSE Computer Science', 'Cambridge', 'IGCSE', 'Computing', 'Cambridge IGCSE Computer Science', '0478', [
    U('Computer systems', ['Number systems', 'Text, sound and images', 'Data storage and compression', 'Data transmission', 'Error detection', 'Encryption', 'Computer architecture', 'Input and output devices', 'Memory, storage and the cloud', 'Network hardware', 'Operating systems', 'Programming languages and translators', 'The internet', 'Cyber security', 'Automated and emerging technologies']),
    U('Algorithms, programming and logic', ['Computational thinking', 'Algorithms and flowcharts', 'Standard algorithms', 'Pseudocode', 'Programming concepts', 'Arrays', 'File handling', 'Databases and SQL', 'Logic gates and truth tables']),
  ]),

  I('cie-igcse-economics', 'Cambridge IGCSE Economics', 'Cambridge', 'IGCSE', 'Economics', 'Cambridge IGCSE Economics', '0455', [
    U('The basic economic problem', ['Scarcity and choice', 'Factors of production', 'Opportunity cost', 'Production possibility curves']),
    U('The allocation of resources', ['Microeconomics and macroeconomics', 'The role of markets', 'Demand', 'Supply', 'Price elasticity', 'Market equilibrium', 'Market failure', 'Mixed economic systems']),
    U('Microeconomic decision makers', ['Money and banking', 'Households', 'Workers and trade unions', 'Firms and production', 'Costs, revenue and objectives', 'Market structures']),
    U('Government and the macroeconomy', ['The role of government', 'Macroeconomic aims', 'Fiscal policy', 'Monetary policy', 'Supply-side policy', 'Economic growth', 'Employment and unemployment', 'Inflation and deflation']),
    U('Economic development', ['Living standards', 'Poverty', 'Population']),
    U('International trade and globalisation', ['Specialisation', 'Free trade and protection', 'Foreign exchange rates', 'The balance of payments']),
  ]),

  I('cie-igcse-english-first-language', 'Cambridge IGCSE English First Language', 'Cambridge', 'IGCSE', 'English', 'Cambridge IGCSE First Language English', '0500', [
    U('Reading', ['Understanding explicit meaning', 'Understanding implicit meaning', 'Writers\' effects and language', 'Summary writing', 'Selecting and using information']),
    U('Writing', ['Directed writing', 'Descriptive writing', 'Narrative writing', 'Writing to argue', 'Writing to inform', 'Spelling, punctuation and grammar']),
  ]),

  I('cie-a-maths', 'Cambridge A level Maths', 'Cambridge', 'A level', 'Maths', 'Cambridge International AS & A Level Mathematics', '9709', [
    U('Pure Mathematics 1', ['Quadratics', 'Functions', 'Coordinate geometry', 'Circular measure', 'Trigonometry', 'Series', 'Differentiation', 'Integration']),
    U('Pure Mathematics 2', ['Algebra', 'Logarithmic and exponential functions', 'Trigonometry', 'Differentiation', 'Integration', 'Numerical solution of equations']),
    U('Pure Mathematics 3', ['Algebra', 'Logarithmic and exponential functions', 'Trigonometry', 'Differentiation', 'Integration', 'Numerical solution of equations', 'Vectors', 'Differential equations', 'Complex numbers']),
    U('Mechanics', ['Forces and equilibrium', 'Kinematics of motion in a straight line', 'Momentum', 'Newton\'s laws of motion', 'Energy, work and power']),
    U('Probability and Statistics 1', ['Representation of data', 'Permutations and combinations', 'Probability', 'Discrete random variables', 'The normal distribution']),
    U('Probability and Statistics 2', ['The Poisson distribution', 'Linear combinations of random variables', 'Continuous random variables', 'Sampling and estimation', 'Hypothesis tests']),
  ]),

  I('cie-a-further-maths', 'Cambridge A level Further Maths', 'Cambridge', 'A level', 'Maths', 'Cambridge International AS & A Level Further Mathematics', '9231', [
    U('Further Pure Mathematics 1', ['Roots of polynomial equations', 'Rational functions and graphs', 'Summation of series', 'Matrices', 'Polar coordinates', 'Vectors', 'Proof by induction']),
    U('Further Pure Mathematics 2', ['Hyperbolic functions', 'Matrices', 'Differential equations', 'Complex numbers', 'Calculus']),
    U('Further Mechanics', ['Motion of a projectile', 'Equilibrium of a rigid body', 'Circular motion', 'Hooke\'s law', 'Linear motion under a variable force', 'Momentum']),
    U('Further Probability and Statistics', ['Continuous random variables', 'Inference using normal and t distributions', 'Chi-squared tests', 'Non-parametric tests', 'Probability generating functions']),
  ]),

  I('cie-a-physics', 'Cambridge A level Physics', 'Cambridge', 'A level', 'Science', 'Cambridge International AS & A Level Physics', '9702', [
    U('AS level', ['Physical quantities and units', 'Kinematics', 'Dynamics', 'Forces, density and pressure', 'Work, energy and power', 'Deformation of solids', 'Waves', 'Superposition', 'Electricity', 'D.C. circuits', 'Particle physics']),
    U('A level', ['Motion in a circle', 'Gravitational fields', 'Temperature', 'Ideal gases', 'Thermodynamics', 'Oscillations', 'Electric fields', 'Capacitance', 'Magnetic fields', 'Alternating currents', 'Quantum physics', 'Nuclear physics', 'Medical physics', 'Astronomy and cosmology']),
  ]),

  I('cie-a-chemistry', 'Cambridge A level Chemistry', 'Cambridge', 'A level', 'Science', 'Cambridge International AS & A Level Chemistry', '9701', [
    U('Physical chemistry', ['Atomic structure', 'Atoms, molecules and stoichiometry', 'Chemical bonding', 'States of matter', 'Chemical energetics', 'Electrochemistry', 'Equilibria', 'Reaction kinetics']),
    U('Inorganic chemistry', ['Chemical periodicity', 'Group 2', 'Group 17', 'Nitrogen and sulfur', 'Transition elements']),
    U('Organic chemistry', ['Introduction to organic chemistry', 'Hydrocarbons', 'Halogen compounds', 'Hydroxy compounds', 'Carbonyl compounds', 'Carboxylic acids and derivatives', 'Nitrogen compounds', 'Polymerisation', 'Organic synthesis']),
    U('Analysis', ['Analytical techniques']),
  ]),

  I('cie-a-biology', 'Cambridge A level Biology', 'Cambridge', 'A level', 'Science', 'Cambridge International AS & A Level Biology', '9700', [
    U('AS level', ['Cell structure', 'Biological molecules', 'Enzymes', 'Cell membranes and transport', 'The mitotic cell cycle', 'Nucleic acids and protein synthesis', 'Transport in plants', 'Transport in mammals', 'Gas exchange', 'Infectious diseases', 'Immunity']),
    U('A level', ['Energy and respiration', 'Photosynthesis', 'Homeostasis', 'Control and coordination', 'Inherited change', 'Selection and evolution', 'Classification, biodiversity and conservation', 'Genetic technology']),
  ]),

  I('cie-a-economics', 'Cambridge A level Economics', 'Cambridge', 'A level', 'Economics', 'Cambridge International AS & A Level Economics', '9708', [
    U('AS level', [
      'Basic economic ideas and resource allocation', 'The price system and the microeconomy', 'Government microeconomic intervention', 'The macroeconomy', 'Government macroeconomic intervention',
      'Demand and supply', 'Elasticity', 'Market failure', 'Inflation and unemployment', 'Fiscal and monetary policy',
    ]),
    U('A level', ['International economic issues']),
  ]),

  I('cie-a-computer-science', 'Cambridge A level Computer Science', 'Cambridge', 'A level', 'Computing', 'Cambridge International AS & A Level Computer Science', '9618', [
    U('AS level', ['Information representation', 'Communication', 'Hardware', 'Processor fundamentals', 'System software', 'Security, privacy and data integrity', 'Ethics and ownership', 'Databases', 'Algorithm design and problem solving', 'Data types and structures', 'Programming', 'Software development']),
    U('A level', ['Data representation', 'Communication and internet technologies', 'Hardware and virtual machines', 'System software', 'Security', 'Artificial intelligence', 'Computational thinking and problem solving', 'Further programming']),
  ]),

  I('edexcel-igcse-maths-a', 'Edexcel International GCSE Maths', 'Pearson Edexcel', 'IGCSE', 'Maths', 'Pearson Edexcel International GCSE Mathematics A', '4MA1', [
    U('Numbers and the number system', ['Integers', 'Fractions', 'Decimals', 'Powers and roots', 'Set language and notation', 'Percentages', 'Ratio and proportion', 'Degree of accuracy', 'Standard form']),
    U('Equations, formulae and identities', ['Algebraic manipulation', 'Expressions and formulae', 'Linear equations', 'Quadratic equations', 'Simultaneous equations', 'Inequalities']),
    U('Sequences, functions and graphs', ['Sequences', 'Functions', 'Graphs', 'Calculus']),
    U('Geometry and trigonometry', ['Angles, lines and triangles', 'Polygons', 'Symmetry', 'Measures', 'Construction', 'Mensuration', 'Similarity', 'Trigonometry', 'Circle properties']),
    U('Vectors and transformation geometry', ['Vectors', 'Transformation geometry']),
    U('Statistics and probability', ['Graphical representation of data', 'Statistical measures', 'Probability']),
  ]),

  I('edexcel-igcse-physics', 'Edexcel International GCSE Physics', 'Pearson Edexcel', 'IGCSE', 'Science', 'Pearson Edexcel International GCSE Physics', '4PH1', [
    U('Forces and motion', ['Movement and position', 'Forces, movement, shape and momentum']),
    U('Electricity', ['Mains electricity', 'Energy and voltage in circuits', 'Electric charge']),
    U('Waves', ['Properties of waves', 'The electromagnetic spectrum', 'Light and sound']),
    U('Energy resources and energy transfers', ['Energy transfers', 'Work and power', 'Energy resources and electricity generation']),
    U('Solids, liquids and gases', ['Density and pressure', 'Change of state', 'Ideal gas molecules']),
    U('Magnetism and electromagnetism', ['Magnetism', 'Electromagnetism']),
    U('Radioactivity and particles', ['Radioactivity', 'Fission and fusion']),
    U('Astrophysics', ['Motion in the universe', 'Stellar evolution']),
  ]),

  I('edexcel-igcse-chemistry', 'Edexcel International GCSE Chemistry', 'Pearson Edexcel', 'IGCSE', 'Science', 'Pearson Edexcel International GCSE Chemistry', '4CH1', [
    U('Principles of chemistry', ['States of matter', 'Separating and purifying substances', 'Atomic structure', 'Relative masses and moles', 'Chemical formulae and equations', 'Ionic bonding', 'Covalent bonding', 'Metallic bonding', 'Electrolysis']),
    U('Inorganic chemistry', ['Group 1', 'Group 7', 'Gases in the atmosphere', 'Reactivity series', 'Acids, alkalis and titrations', 'Salt preparation', 'Chemical tests']),
    U('Physical chemistry', ['Energetics', 'Rates of reaction', 'Reversible reactions and equilibria']),
    U('Organic chemistry', ['Introduction to organic chemistry', 'Crude oil', 'Alkanes', 'Alkenes', 'Synthetic polymers']),
  ]),

  I('edexcel-igcse-biology', 'Edexcel International GCSE Biology', 'Pearson Edexcel', 'IGCSE', 'Science', 'Pearson Edexcel International GCSE Biology', '4BI1', [
    U('The nature and variety of living organisms', ['Characteristics of living organisms', 'Variety of living organisms']),
    U('Structure and functions in living organisms', ['Levels of organisation', 'Cell structure', 'Biological molecules', 'Movement into and out of cells', 'Nutrition', 'Respiration', 'Gas exchange', 'Transport', 'Excretion', 'Coordination and response']),
    U('Reproduction and inheritance', ['Reproduction', 'Inheritance']),
    U('Ecology and the environment', ['The organism in the environment', 'Feeding relationships', 'Cycles within ecosystems', 'Human influences on the environment']),
    U('Use of biological resources', ['Food production', 'Selective breeding', 'Genetic modification', 'Cloning']),
  ]),

  I('edexcel-ial-maths', 'Edexcel International A level Maths', 'Pearson Edexcel', 'A level', 'Maths', 'Pearson Edexcel International A Level Mathematics', 'YMA01', [
    U('Pure Mathematics 1', ['Algebra and functions', 'Coordinate geometry', 'Sequences and series', 'Trigonometry', 'Differentiation', 'Integration']),
    U('Mechanics 1', ['Mathematical models in mechanics', 'Kinematics of a particle in a straight line', 'Dynamics of a particle', 'Statics of a particle', 'Moments']),
    U('Statistics 1', ['Mathematical models in probability and statistics', 'Representation and summary of data', 'Probability', 'Correlation and regression', 'Discrete random variables', 'The normal distribution']),
  ], ['WMA11']),

  I('ib-maths-aa', 'IB Diploma Maths Analysis and Approaches', 'IB', 'IB Diploma', 'Maths', 'IB Diploma Mathematics: Analysis and Approaches', 'IB MAA', [
    U('Number and algebra', ['Sequences and series', 'Exponents and logarithms', 'The binomial theorem', 'Systems of equations', 'Proof', 'Complex numbers']),
    U('Functions', ['Equations of straight lines', 'The concept of a function', 'Graphs of functions', 'Transformations of graphs', 'Composite and inverse functions', 'Quadratic functions', 'Rational and exponential functions', 'Polynomial functions']),
    U('Geometry and trigonometry', ['Volume and surface area', 'Right-angled trigonometry', 'The sine and cosine rules', 'Radians', 'The unit circle', 'Trigonometric identities', 'Vectors']),
    U('Probability and statistics', ['Sampling', 'Summary statistics', 'Correlation and regression', 'Probability', 'Discrete random variables', 'The normal distribution', 'Continuous random variables']),
    U('Calculus', ['Limits and derivatives', 'Rules of differentiation', 'Tangents and normals', 'Integration', 'Kinematics', 'Optimisation', 'Differential equations', 'Maclaurin series']),
  ]),

  I('ib-physics', 'IB Diploma Physics', 'IB', 'IB Diploma', 'Science', 'IB Diploma Physics', 'IB PHY', [
    U('Space, time and motion', ['Kinematics', 'Forces and momentum', 'Work, energy and power', 'Rigid body mechanics', 'Galilean and special relativity']),
    U('The particulate nature of matter', ['Thermal energy transfers', 'Greenhouse effect', 'Gas laws', 'Current and circuits', 'Thermodynamics']),
    U('Wave behaviour', ['Simple harmonic motion', 'Wave model', 'Wave phenomena', 'Standing waves and resonance', 'The Doppler effect']),
    U('Fields', ['Gravitational fields', 'Electric and magnetic fields', 'Motion in electromagnetic fields', 'Induction']),
    U('Nuclear and quantum physics', ['Structure of the atom', 'Quantum physics', 'Radioactive decay', 'Fission', 'Fusion and stars']),
  ]),

  I('ib-chemistry', 'IB Diploma Chemistry', 'IB', 'IB Diploma', 'Science', 'IB Diploma Chemistry', 'IB CHE', [
    U('Structure', ['The particulate nature of matter', 'The nuclear atom', 'Electron configurations', 'The mole', 'Ideal gases', 'The ionic model', 'The covalent model', 'The metallic model', 'The periodic table', 'Functional groups']),
    U('Reactivity', ['Measuring enthalpy changes', 'Energy cycles', 'Energy from fuels', 'Entropy and spontaneity', 'Amount of chemical change', 'Rates of reaction', 'Extent of chemical change', 'Proton transfer', 'Electron transfer', 'Electron sharing reactions', 'Electron pair sharing reactions']),
  ]),

  I('ib-biology', 'IB Diploma Biology', 'IB', 'IB Diploma', 'Science', 'IB Diploma Biology', 'IB BIO', [
    U('Unity and diversity', ['Water', 'Nucleic acids', 'Origins of cells', 'Cell structure', 'Viruses', 'Diversity of organisms', 'Classification and cladistics', 'Evolution and speciation', 'Conservation of biodiversity']),
    U('Form and function', ['Carbohydrates and lipids', 'Proteins', 'Membranes and transport', 'Organelles and compartmentalisation', 'Cell specialisation', 'Gas exchange', 'Transport', 'Muscle and motility', 'Adaptation to environment']),
    U('Interaction and interdependence', ['Enzymes and metabolism', 'Cell respiration', 'Photosynthesis', 'Chemical signalling', 'Neural signalling', 'Defence against disease', 'Populations and communities', 'Transfers of energy and matter']),
    U('Continuity and change', ['DNA replication', 'Protein synthesis', 'Mutations and gene editing', 'Cell and nuclear division', 'Gene expression', 'Reproduction', 'Inheritance', 'Homeostasis', 'Natural selection', 'Sustainability and change', 'Climate change']),
  ]),
]
