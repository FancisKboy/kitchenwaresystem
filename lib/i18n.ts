export type Language = 'en' | 'rw';

export const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    products: 'Products',
    purchases: 'Purchases',
    sales: 'Sales',
    inventory: 'Inventory',
    customers: 'Customers',
    debts: 'Debts',
    reports: 'Reports',
    history: 'History',
    settings: 'Settings',
    stockManagement: 'Stock Management',
    mainMenu: 'Main Menu',
    overview: 'Overview',
    welcomeBack: 'Welcome back',
    signOut: 'Sign out',
    signedInAs: 'Signed in as',
    kitchenware: 'Kitchenware',

    // Dashboard
    todaysRevenue: "Today's Revenue",
    todaysProfit: "Today's Profit",
    cashReceived: 'Cash Received',
    outstandingDebt: 'Outstanding Debt',

    salesRevenueToday: 'Sales revenue today',
    grossProfitToday: 'Gross profit today',
    paymentsReceivedToday: 'Payments received today',
    customerBalances: 'Customer balances',

    lowOutOfStock: 'Low / Out of Stock',
    recentActivity: 'Recent Activity',

    inventoryOverview: 'Stock overview will appear here.',
    stockAttention: 'Products needing attention will appear here.',
    recentBusinessActivity:
      'Recent purchases, sales and adjustments will appear here.',

    quickActions: 'Quick Actions',
    quickActionsDescription: 'Common actions for daily business operations.',

    newPurchase: 'New Purchase',
    newSale: 'New Sale',
    viewInventory: 'View Inventory',
    viewReports: 'View Reports',

    // Settings
    theme: 'Theme',
    language: 'Language',
    light: 'Light',
    dark: 'Dark',
    english: 'English',
    kinyarwanda: 'Kinyarwanda',

    settingsDescription:
      'Customize the appearance and language of your application.',

    preferences: 'Preferences',
    appearance: 'Appearance',
    chooseTheme: 'Choose how the application looks.',
    chooseLanguage: 'Choose the language used throughout the application.',

    // Products
    catalog: 'Catalog',
    productsDescription:
      'Manage product families and their exact sellable types.',

    addProduct: 'Add Product',
    addProductType: 'Add Product Type',

    product: 'Product',
    productTypes: 'Product Types',
    productTypesKinds: 'Product Types / Kinds',
    parentProduct: 'Parent Product',
    productTypeKind: 'Product Type / Kind',

    searchProducts: 'Search products...',
    searchProductTypes: 'Search product types...',

    status: 'Status',
    created: 'Created',
    action: 'Action',
    image: 'Image',
    minimumStock: 'Minimum Stock',
    stock: 'Stock',
    batches: 'Batches',
    stockValue: 'Stock Value',

    active: 'Active',
    inactive: 'Inactive',
    available: 'Available',
    notAdded: 'Not added',
    imageAvailable: 'Image available',
    noImage: 'No image',

    loadingProducts: 'Loading products...',
    noProductsFound: 'No products found.',
    noProductTypesFound: 'No product types found.',

    viewDetails: 'View details',
    productDetails: 'Product Details',
    close: 'Close',
    cancel: 'Cancel',

    productDetailsDescription:
      'View product information and the product types under it.',

    exactSellableVariations: 'Exact sellable variations under this product.',

    noProductTypesYet: 'No product types yet',
    addFirstProductType: 'Add the first exact type for this product.',

    addType: 'Add Type',

    createProductTitle: 'Add Product',
    createProductDescription:
      'Create a product family such as Forks or Plates.',

    productName: 'Product Name',
    productNamePlaceholder: 'e.g. Forks',

    description: 'Description',
    optionalDescription: 'Optional description',

    createProduct: 'Create Product',
    saving: 'Saving...',

    createProductTypeTitle: 'Add Product Type',
    createProductTypeDescription: 'Create the exact sellable variation.',

    selectProduct: 'Select product',

    productTypePlaceholder: 'e.g. Large Golden Fork',

    createProductType: 'Create Product Type',

    minimumStockZeroOrGreater: 'Minimum stock must be zero or greater.',

    productNameRequired: 'Product name is required.',
    parentProductRequired: 'Select a parent product.',
    productTypeRequired: 'Product type name is required.',

    productCreatedSuccessfully: 'Product created successfully.',

    productTypeCreatedSuccessfully: 'Product type created successfully.',

    unknownProduct: 'Unknown product',
    noDescription: 'No description',

    // Product editing
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save',
    update: 'Update',
    confirm: 'Confirm',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    yes: 'Yes',
    no: 'No',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',

    editProduct: 'Edit Product',
    editProductType: 'Edit Product Type',
    activate: 'Activate',
    deactivate: 'Deactivate',

    productUpdatedSuccessfully: 'Product updated successfully.',

    productTypeUpdatedSuccessfully: 'Product type updated successfully.',

    confirmDeactivateProduct:
      'Are you sure you want to deactivate this product?',

    confirmDeactivateProductType:
      'Are you sure you want to deactivate this product type?',

    uploadImage: 'Upload Image',
    changeImage: 'Change Image',
    removeImage: 'Remove Image',

    imageTooLarge: 'Image must be 5 MB or smaller.',

    invalidImageType: 'Only JPG, PNG, and WebP images are allowed.',

    imageUploadFailed: 'Image upload failed.',

    imageUpdatedSuccessfully: 'Product type image updated successfully.',

    imageRemovedSuccessfully: 'Product type image removed successfully.',

    // Sales
    salesManagement: 'Sales Management',
    salesDescription:
      'Create sales, track payments, and monitor customer balances.',

    salesHistory: 'Sales History',
    sale: 'Sale',
    saleDetails: 'Sale Details',
    saleDate: 'Sale Date',
    customer: 'Customer',
    walkInCustomer: 'Walk-in Customer',

    totalRevenue: 'Total Revenue',
    totalCost: 'Total Cost',
    totalProfit: 'Total Profit',

    amountPaid: 'Amount Paid',
    amountDue: 'Amount Due',
    paymentStatus: 'Payment Status',

    paid: 'Paid',
    partial: 'Partial',
    unpaid: 'Unpaid',

    createSale: 'Create Sale',
    createSaleTitle: 'Create New Sale',
    createSaleDescription:
      'Add products, set selling prices, and record the customer payment.',

    addItem: 'Add Item',
    addProductItem: 'Add Product',
    removeItem: 'Remove Item',

    quantity: 'Quantity',
    sellingPrice: 'Selling Price',
    revenue: 'Revenue',
    cost: 'Cost',
    profit: 'Profit',

    productType: 'Product Type',
    selectProductType: 'Select product type',

    searchSales: 'Search sales...',
    noSalesFound: 'No sales found.',
    loadingSales: 'Loading sales...',

    saleCreatedSuccessfully: 'Sale created successfully.',

    viewSaleDetails: 'View Sale Details',

    saleHeader: 'Sale Header',
    soldItems: 'Sold Items',
    paymentSummary: 'Payment Summary',
    paymentHistory: 'Payment History',

    batch: 'Batch',
    batchNumber: 'Batch Number',
    unitCost: 'Unit Cost',
    allocatedQuantity: 'Allocated Quantity',
    fifoCosting: 'FIFO Costing',

    initialPayment: 'Initial Payment',
    installmentPayment: 'Installment Payment',
    finalPayment: 'Final Payment',

    addPayment: 'Add Payment',
    recordPayment: 'Record Payment',
    paymentAmount: 'Payment Amount',
    paymentDate: 'Payment Date',
    paymentNotes: 'Payment Notes',
    optionalNotes: 'Optional notes',

    paymentRecordedSuccessfully: 'Payment recorded successfully.',

    correctPayment: 'Correct Payment',
    correctPaymentTitle: 'Correct Payment',
    correctPaymentDescription:
      'Update the amount, date, or notes for this payment.',

    correctedPaymentAmount: 'Corrected Payment Amount',

    paymentCorrectedSuccessfully: 'Payment corrected successfully.',

    noPaymentsFound: 'No payments recorded.',

    initialPaymentAtSaleCreation: 'Initial payment at sale creation',

    saleNotes: 'Sale Notes',
    noNotes: 'No notes',

    totalItems: 'Total Items',
    item: 'Item',
    items: 'Items',

    // Customers
    customerName: 'Customer Name',
    customerPhone: 'Phone',
    customerAddress: 'Address',
    customerNotes: 'Notes',

    addCustomer: 'Add Customer',
    addCustomerTitle: 'Add Customer',
    addCustomerDescription: 'Create a customer for this sale.',

    createCustomer: 'Create Customer',
    customerCreatedSuccessfully: 'Customer created successfully.',

    selectCustomer: 'Select customer',

    // Common validation
    required: 'Required',
    invalidAmount: 'Please enter a valid amount.',
    invalidQuantity: 'Please enter a valid quantity.',
    insufficientStock: 'Insufficient stock available.',
  },

  rw: {
    // Navigation
    dashboard: 'Ahabanza',
    products: 'Ibicuruzwa',
    purchases: 'Ibyaguzwe',
    sales: 'Ibyagurishijwe',
    inventory: 'Ububiko',
    customers: 'Abakiriya',
    debts: 'Amadeni',
    reports: 'Raporo',
    history: 'Amateka',
    settings: 'Igenamiterere',

    mainMenu: 'Ibikubiyemo',
    overview: 'Incamake',
    welcomeBack: 'Murakaza neza',
    signOut: 'Sohoka',
    signedInAs: 'Winjiye nka',
    kitchenware: 'Kitchenware',

    // Dashboard
    todaysRevenue: 'Amafaranga yagurishijwe uyu munsi',
    todaysProfit: 'Inyungu y’uyu munsi',
    cashReceived: 'Amafaranga yakiriwe',
    outstandingDebt: 'Amadeni asigaye',

    salesRevenueToday: 'Amafaranga yagurishijwe uyu munsi',
    grossProfitToday: 'Inyungu mbumbe y’uyu munsi',
    paymentsReceivedToday: 'Amafaranga yakiriwe uyu munsi',
    customerBalances: 'Amadeni y’abakiriya',

    lowOutOfStock: 'Ibicuruzwa bike / byashize',
    recentActivity: 'Ibikorwa biheruka',

    inventoryOverview: 'Incamake y’ububiko izagaragara hano.',
    stockAttention: 'Ibicuruzwa bisaba kwitabwaho bizagaragara hano.',
    recentBusinessActivity:
      'Ibyaguzwe, ibyagurishijwe n’ibindi bikorwa biheruka bizagaragara hano.',

    quickActions: 'Ibikorwa Byihuse',
    quickActionsDescription:
      'Ibikorwa bikunze gukoreshwa mu micungire ya buri munsi.',

    newPurchase: 'Kwinjiza Ibyaguzwe',
    newSale: 'Kugurisha',
    viewInventory: 'Reba Ububiko',
    viewReports: 'Reba Raporo',

    // Settings
    theme: 'Imiterere',
    language: 'Ururimi',
    light: 'Urumuri',
    dark: 'Umwijima',
    english: 'Icyongereza',
    kinyarwanda: 'Kinyarwanda',

    settingsDescription: 'Hindura imiterere n’ururimi bya sisitemu.',

    preferences: 'Ibyifuzo',
    appearance: 'Imiterere',
    chooseTheme: 'Hitamo uko sisitemu igaragara.',
    chooseLanguage: 'Hitamo ururimi ruzakoreshwa muri sisitemu yose.',

    // Products
    catalog: 'Urutonde rw’ibicuruzwa',
    productsDescription:
      'Gucunga amatsinda y’ibicuruzwa n’ubwoko bwabyo bwo kugurisha.',

    addProduct: 'Ongeraho Igicuruzwa',
    addProductType: 'Ongeraho Ubwoko bw’Igicuruzwa',

    product: 'Igicuruzwa',
    productTypes: 'Ubwoko bw’Ibicuruzwa',
    productTypesKinds: 'Ubwoko / Imiterere y’Igicuruzwa',
    parentProduct: 'Igicuruzwa Shingiro',
    productTypeKind: 'Ubwoko / Imiterere y’Igicuruzwa',

    searchProducts: 'Shakisha ibicuruzwa...',
    searchProductTypes: 'Shakisha ubwoko bw’ibicuruzwa...',

    status: 'Imiterere',
    created: 'Byakozwe',
    action: 'Igikorwa',
    image: 'Ifoto',
    minimumStock: 'Ububiko Ntarengwa',
    stock: 'Ububiko',
    batches: 'Amatsinda y’Ububiko',
    stockValue: 'Agaciro k’Ububiko',

    active: 'Bikora',
    inactive: 'Bidakora',
    available: 'Birahari',
    notAdded: 'Ntabwo byashyizweho',
    imageAvailable: 'Ifoto irahari',
    noImage: 'Nta foto',

    loadingProducts: 'Ibicuruzwa birimo gutunganywa...',
    noProductsFound: 'Nta bicuruzwa byabonetse.',
    noProductTypesFound: 'Nta bwoko bw’ibicuruzwa bwabonetse.',

    viewDetails: 'Reba ibisobanuro',
    productDetails: 'Ibisobanuro by’Igicuruzwa',
    close: 'Funga',
    cancel: 'Hagarika',

    productDetailsDescription: 'Reba amakuru y’icyo gicuruzwa n’ubwoko bwacyo.',

    exactSellableVariations:
      'Ubwoko nyabwo bw’igicuruzwa bushobora kugurishwa.',

    noProductTypesYet: 'Nta bwoko bw’igicuruzwa burashyirwaho',
    addFirstProductType: 'Ongeraho ubwoko bwa mbere bw’iki gicuruzwa.',

    addType: 'Ongeraho Ubwoko',

    createProductTitle: 'Ongeraho Igicuruzwa',
    createProductDescription:
      'Kora itsinda ry’igicuruzwa nka Forks cyangwa Plates.',

    productName: 'Izina ry’Igicuruzwa',
    productNamePlaceholder: 'urugero: Forks',

    description: 'Ibisobanuro',
    optionalDescription: 'Ibisobanuro bidateganyijwe',

    createProduct: 'Kora Igicuruzwa',
    saving: 'Birimo kubikwa...',

    createProductTypeTitle: 'Ongeraho Ubwoko bw’Igicuruzwa',
    createProductTypeDescription:
      'Kora ubwoko nyabwo bw’igicuruzwa bugurishwa.',

    selectProduct: 'Hitamo igicuruzwa',

    productTypePlaceholder: 'urugero: Large Golden Fork',

    createProductType: 'Kora Ubwoko bw’Igicuruzwa',

    minimumStockZeroOrGreater:
      'Ububiko ntarengwa bugomba kuba zeru cyangwa burengeye zeru.',

    productNameRequired: 'Izina ry’igicuruzwa rirakenewe.',
    parentProductRequired: 'Hitamo igicuruzwa shingiro.',
    productTypeRequired: 'Izina ry’ubwoko bw’igicuruzwa rirakenewe.',

    productCreatedSuccessfully: 'Igicuruzwa cyakozwe neza.',

    productTypeCreatedSuccessfully: 'Ubwoko bw’igicuruzwa bwakozwe neza.',

    unknownProduct: 'Igicuruzwa kitazwi',
    noDescription: 'Nta bisobanuro',

    // Product editing
    edit: 'Hindura',
    delete: 'Siba',
    save: 'Bika',
    update: 'Vugurura',
    confirm: 'Emeza',
    back: 'Subira inyuma',
    next: 'Ibikurikira',
    previous: 'Ibibanziriza',
    yes: 'Yego',
    no: 'Oya',
    loading: 'Birimo gutunganywa...',
    error: 'Ikosa',
    success: 'Byagenze neza',

    editProduct: 'Hindura Igicuruzwa',
    editProductType: 'Hindura Ubwoko bw’Igicuruzwa',
    activate: 'Kora',
    deactivate: 'Hagarika',

    productUpdatedSuccessfully: 'Igicuruzwa cyavuguruwe neza.',

    productTypeUpdatedSuccessfully: 'Ubwoko bw’igicuruzwa bwavuguruwe neza.',

    confirmDeactivateProduct: 'Uremeza ko ushaka guhagarika iki gicuruzwa?',

    confirmDeactivateProductType:
      'Uremeza ko ushaka guhagarika ubu bwoko bw’igicuruzwa?',

    uploadImage: 'Ongeraho Ifoto',
    changeImage: 'Hindura Ifoto',
    removeImage: 'Kuraho Ifoto',

    imageTooLarge: 'Ifoto igomba kuba 5 MB cyangwa munsi yayo.',

    invalidImageType: 'Hemewe gusa amafoto ya JPG, PNG na WebP.',

    imageUploadFailed: 'Kohereza ifoto byanze.',

    imageUpdatedSuccessfully: 'Ifoto y’ubwoko bw’igicuruzwa yavuguruwe neza.',

    imageRemovedSuccessfully: 'Ifoto y’ubwoko bw’igicuruzwa yakuweho neza.',

    // Sales
    salesManagement: 'Imicungire y’Ibyagurishijwe',
    salesDescription:
      'Kora igurisha, kurikirana ubwishyu n’amadeni y’abakiriya.',

    salesHistory: 'Amateka y’Ibyagurishijwe',
    sale: 'Igurisha',
    saleDetails: 'Ibisobanuro by’Igurisha',
    saleDate: 'Itariki y’Igurisha',
    customer: 'Umukiriya',
    walkInCustomer: 'Umukiriya Uje Gutunguranye',

    totalRevenue: 'Amafaranga Yose Yagurishijwe',
    totalCost: 'Igiciro Cyose Cyaguze',
    totalProfit: 'Inyungu Yose',

    amountPaid: 'Amafaranga Yishyuwe',
    amountDue: 'Amafaranga Asigaye',
    paymentStatus: 'Imiterere y’Ubwishyu',

    paid: 'Byishyuwe',
    partial: 'Igice Cyishyuwe',
    unpaid: 'Ntabwo Byishyuwe',
    stockManagement: 'Imicungire y’Imari y’Ububiko',

    createSale: 'Kora Igurisha',
    createSaleTitle: 'Kora Igurisha Rishya',
    createSaleDescription:
      'Ongeramo ibicuruzwa, shyiraho ibiciro byo kugurisha kandi wandike ubwishyu bw’umukiriya.',

    addItem: 'Ongeraho Igicuruzwa',
    addProductItem: 'Ongeraho Igicuruzwa',
    removeItem: 'Kuraho Igicuruzwa',

    quantity: 'Umubare',
    sellingPrice: 'Igiciro cyo Kugurisha',
    revenue: 'Amafaranga Yinjijwe',
    cost: 'Igiciro',
    profit: 'Inyungu',

    productType: 'Ubwoko bw’Igicuruzwa',
    selectProductType: 'Hitamo ubwoko bw’igicuruzwa',

    searchSales: 'Shakisha ibyagurishijwe...',
    noSalesFound: 'Nta byagurishijwe byabonetse.',
    loadingSales: 'Ibyagurishijwe birimo gutunganywa...',

    saleCreatedSuccessfully: 'Igurisha ryakozwe neza.',

    viewSaleDetails: 'Reba Ibisobanuro by’Igurisha',

    saleHeader: 'Amakuru y’Igurisha',
    soldItems: 'Ibicuruzwa Byagurishijwe',
    paymentSummary: 'Incamake y’Ubwishyu',
    paymentHistory: 'Amateka y’Ubwishyu',

    batch: 'Batch',
    batchNumber: 'Nomero ya Batch',
    unitCost: 'Igiciro kuri kimwe',
    allocatedQuantity: 'Umubare Wakoreshejwe',
    fifoCosting: 'Kubara Igiciro hakurikijwe FIFO',

    initialPayment: 'Ubwishyu bwa Mbere',
    installmentPayment: 'Ubwishyu bw’Igice',
    finalPayment: 'Ubwishyu bwa Nyuma',

    addPayment: 'Ongeraho Ubwishyu',
    recordPayment: 'Andika Ubwishyu',
    paymentAmount: 'Amafaranga Yishyuwe',
    paymentDate: 'Itariki y’Ubwishyu',
    paymentNotes: 'Ibisobanuro by’Ubwishyu',
    optionalNotes: 'Ibisobanuro bidategetswe',

    paymentRecordedSuccessfully: 'Ubwishyu bwanditswe neza.',

    correctPayment: 'Hindura Ubwishyu',
    correctPaymentTitle: 'Hindura Ubwishyu',
    correctPaymentDescription:
      'Hindura amafaranga, itariki cyangwa ibisobanuro by’ubu bwishyu.',

    correctedPaymentAmount: 'Amafaranga Y’Ubwishyu Yahinduwe',

    paymentCorrectedSuccessfully: 'Ubwishyu bwahinduwe neza.',

    noPaymentsFound: 'Nta bwishyu bwanditswe.',

    initialPaymentAtSaleCreation:
      'Ubwishyu bwa mbere igihe igurisha ryakorwaga',

    saleNotes: 'Ibisobanuro by’Igurisha',
    noNotes: 'Nta bisobanuro',

    totalItems: 'Ibicuruzwa Byose',
    item: 'Igicuruzwa',
    items: 'Ibicuruzwa',

    // Customers
    customerName: 'Izina ry’Umukiriya',
    customerPhone: 'Telefone',
    customerAddress: 'Aderesi',
    customerNotes: 'Ibisobanuro',

    addCustomer: 'Ongeraho Umukiriya',
    addCustomerTitle: 'Ongeraho Umukiriya',
    addCustomerDescription: 'Kora umukiriya mushya kuri iri gurisha.',

    createCustomer: 'Kora Umukiriya',
    customerCreatedSuccessfully: 'Umukiriya yakozwe neza.',

    selectCustomer: 'Hitamo umukiriya',

    // Common validation
    required: 'Birakenewe',
    invalidAmount: 'Andika amafaranga yemewe.',
    invalidQuantity: 'Andika umubare wemewe.',
    insufficientStock: 'Ububiko buhari ntibuhagije.',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;
