    /* ==========================================================================
       STATE MANAGEMENT & LOCAL STORAGE
       ========================================================================== */
    let rawData = [];
    let filteredData = [];
    let chartTrendInstance = null;
    let chartCatInstance = null;
    let chartExpInstance = null;
    let adminPin = "1234";

    /* PELACAK PERUBAHAN BELUM DISIMPAN (untuk tombol Simpan Perubahan) */
    let unsavedChanges = false;
    const _origSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      try {
        if (this === window.localStorage && typeof k === 'string' && k.indexOf('resto_sim_') === 0 &&
            k !== 'resto_sim_seed_applied' && this.getItem(k) !== String(v)) {
          unsavedChanges = true;
          if (typeof refreshSaveLabel === 'function') refreshSaveLabel();
        }
      } catch (e) {}
      return _origSetItem.apply(this, arguments);
    };
    window.addEventListener('beforeunload', function (ev) {
      if (unsavedChanges) { ev.preventDefault(); ev.returnValue = ''; }
    });

    /* DAFTAR 66 MENU DARI POS + HARGA POKOK (HPP) PER PORSI
       n = nama menu, c = kategori, p = harga jual (Rp), h = harga pokok / HPP per porsi (Rp) */
    const POS_MENU_MASTER = [{"n":"Chicken Katsu","c":"Japanese","p":45000,"h":16000},{"n":"Salmon Sushi","c":"Japanese","p":65000,"h":27500},{"n":"Chicken Ramen","c":"Japanese","p":48000,"h":17500},{"n":"Beef Teriyaki","c":"Japanese","p":58000,"h":23000},{"n":"Japanese Curry Rice","c":"Japanese","p":42000,"h":15000},{"n":"Takoyaki","c":"Japanese","p":30000,"h":9500},{"n":"Chicken Yakitori","c":"Japanese","p":35000,"h":12500},{"n":"Sweet and Sour Chicken","c":"Chinese","p":42000,"h":14500},{"n":"Kung Pao Chicken","c":"Chinese","p":45000,"h":15500},{"n":"Beef Black Pepper","c":"Chinese","p":58000,"h":23000},{"n":"Yangzhou Fried Rice","c":"Chinese","p":35000,"h":12000},{"n":"Chicken Chow Mein","c":"Chinese","p":38000,"h":13000},{"n":"Dimsum","c":"Chinese","p":32000,"h":10500},{"n":"Xiao Long Bao","c":"Chinese","p":45000,"h":15500},{"n":"Wonton Soup","c":"Chinese","p":30000,"h":9000},{"n":"Chicken Biryani","c":"Indian","p":48000,"h":17000},{"n":"Butter Chicken","c":"Indian","p":55000,"h":19000},{"n":"Chicken Tikka Masala","c":"Indian","p":55000,"h":19000},{"n":"Tandoori Chicken","c":"Indian","p":58000,"h":20500},{"n":"Samosa","c":"Indian","p":25000,"h":7500},{"n":"Beef Steak","c":"Western","p":95000,"h":43000},{"n":"Spaghetti Bolognese","c":"Western","p":45000,"h":15500},{"n":"Classic Cheeseburger","c":"Western","p":48000,"h":16500},{"n":"Chicken Alfredo","c":"Western","p":50000,"h":17000},{"n":"Fish and Chips","c":"Western","p":55000,"h":20000},{"n":"Margherita Pizza","c":"Western","p":65000,"h":22000},{"n":"Chicken Cordon Bleu","c":"Western","p":58000,"h":19500},{"n":"Lasagna","c":"Western","p":52000,"h":17500},{"n":"BBQ Ribs","c":"Western","p":115000,"h":48500},{"n":"Carbonara Pasta","c":"Western","p":48000,"h":16500},{"n":"Nasi Goreng Special","c":"Indonesian","p":35000,"h":11000},{"n":"Nasi Ayam Geprek","c":"Indonesian","p":30000,"h":9500},{"n":"Nasi Rendang","c":"Indonesian","p":48000,"h":17500},{"n":"Sate Ayam","c":"Indonesian","p":38000,"h":12000},{"n":"Mie Goreng Jawa","c":"Indonesian","p":30000,"h":9500},{"n":"Ayam Penyet","c":"Indonesian","p":35000,"h":11000},{"n":"Soto Ayam","c":"Indonesian","p":30000,"h":9500},{"n":"Bakso Special","c":"Indonesian","p":32000,"h":10000},{"n":"Nasi Liwet","c":"Indonesian","p":35000,"h":11000},{"n":"Gurame Bakar","c":"Indonesian","p":75000,"h":30000},{"n":"Hot Americano","c":"Hot Drinks","p":25000,"h":5500},{"n":"Hot Cappuccino","c":"Hot Drinks","p":32000,"h":7000},{"n":"Hot Café Latte","c":"Hot Drinks","p":32000,"h":7000},{"n":"Hot Matcha Latte","c":"Hot Drinks","p":35000,"h":9000},{"n":"Hot Chocolate","c":"Hot Drinks","p":30000,"h":6500},{"n":"Iced Americano","c":"Ice Drinks","p":25000,"h":6000},{"n":"Iced Caramel Latte","c":"Ice Drinks","p":35000,"h":8500},{"n":"Iced Matcha Latte","c":"Ice Drinks","p":38000,"h":10500},{"n":"Iced Chocolate","c":"Ice Drinks","p":32000,"h":7500},{"n":"Iced Thai Tea","c":"Ice Drinks","p":28000,"h":6500},{"n":"Iced Lemon Tea","c":"Ice Drinks","p":25000,"h":6000},{"n":"Strawberry Smoothie","c":"Ice Drinks","p":38000,"h":9000},{"n":"Mango Juice","c":"Ice Drinks","p":30000,"h":7000},{"n":"Chocolate Lava Cake","c":"Dessert & Snacks","p":38000,"h":11500},{"n":"Tiramisu","c":"Dessert & Snacks","p":40000,"h":12000},{"n":"Strawberry Cheesecake","c":"Dessert & Snacks","p":42000,"h":12500},{"n":"Mochi","c":"Dessert & Snacks","p":25000,"h":7500},{"n":"Macarons","c":"Dessert & Snacks","p":35000,"h":12000},{"n":"Belgian Waffle","c":"Dessert & Snacks","p":38000,"h":11500},{"n":"Churros","c":"Dessert & Snacks","p":30000,"h":9000},{"n":"Vanilla Ice Cream","c":"Ice Cream","p":20000,"h":5500},{"n":"Chocolate Ice Cream","c":"Ice Cream","p":20000,"h":5500},{"n":"Strawberry Ice Cream","c":"Ice Cream","p":20000,"h":5500},{"n":"Matcha Ice Cream","c":"Ice Cream","p":25000,"h":7000},{"n":"Cookies and Cream","c":"Ice Cream","p":25000,"h":7000},{"n":"Air Mineral","c":"Ice Drinks","p":35000,"h":4000}];
    const HPP_SYNC_FLAG = 'resto_sim_hpp_sync_v2';

    /* ==========================================================================
       STOK BAHAN BAKU SESUAI MENU POS
       - 6 kategori bahan: Bumbu & Rempah, Daging & Protein, Sayuran & Buah, Beras & Sembako,
         Kemasan / Operasional, Beverage / Coffee
       - Resep: pemakaian bahan per 1 porsi untuk 66 menu POS. Setiap penjualan memotong stok bahan otomatis.
         mode:"takeaway" = hanya terpotong bila pesanan bertipe Take Away (kemasan sekali pakai).
       ========================================================================== */
    const STOCK_SYNC_FLAG = 'resto_sim_stock_menu_v3';
    const STOCK_CATEGORIES = ["Bumbu & Rempah", "Daging & Protein", "Sayuran & Buah", "Beras & Sembako", "Kemasan / Operasional", "Beverage / Coffee"];
    const STOCK_MASTER_V3 = [{"id":1,"name":"Bawang Putih","category":"Bumbu & Rempah","qty":8,"unit":"kg","minStock":3,"price":40000},{"id":2,"name":"Bawang Merah","category":"Bumbu & Rempah","qty":10,"unit":"kg","minStock":4,"price":38000},{"id":3,"name":"Jahe, Kunyit & Lengkuas","category":"Bumbu & Rempah","qty":5,"unit":"kg","minStock":2,"price":28000},{"id":4,"name":"Serai, Daun Salam & Daun Jeruk","category":"Bumbu & Rempah","qty":3,"unit":"kg","minStock":1,"price":30000},{"id":5,"name":"Cabai Merah Keriting","category":"Bumbu & Rempah","qty":6,"unit":"kg","minStock":2.5,"price":45000},{"id":6,"name":"Cabai Rawit","category":"Bumbu & Rempah","qty":4,"unit":"kg","minStock":1.5,"price":60000},{"id":7,"name":"Bumbu Dasar Rempah Basah (Rendang/Soto/Liwet)","category":"Bumbu & Rempah","qty":12,"unit":"kg","minStock":5,"price":40000},{"id":8,"name":"Garam Halus","category":"Bumbu & Rempah","qty":10,"unit":"kg","minStock":3,"price":9000},{"id":9,"name":"Lada Hitam / Black Pepper","category":"Bumbu & Rempah","qty":2,"unit":"kg","minStock":0.5,"price":120000},{"id":10,"name":"Garam Masala & Rempah India","category":"Bumbu & Rempah","qty":2,"unit":"kg","minStock":0.6,"price":190000},{"id":11,"name":"Tikka / Tandoori Masala Paste","category":"Bumbu & Rempah","qty":4,"unit":"kg","minStock":1.5,"price":140000},{"id":12,"name":"Japanese Curry Roux","category":"Bumbu & Rempah","qty":4,"unit":"kg","minStock":1.5,"price":130000},{"id":13,"name":"Oregano & Herbs Kering (Italian)","category":"Bumbu & Rempah","qty":1,"unit":"kg","minStock":0.3,"price":160000},{"id":14,"name":"Kaldu Ayam Bubuk","category":"Bumbu & Rempah","qty":3,"unit":"kg","minStock":1,"price":85000},{"id":15,"name":"Dashi Powder & Bonito","category":"Bumbu & Rempah","qty":1,"unit":"kg","minStock":0.5,"price":300000},{"id":16,"name":"Wasabi & Acar Jahe (Gari)","category":"Bumbu & Rempah","qty":0.9,"unit":"kg","minStock":0.5,"price":180000},{"id":17,"name":"Kayu Manis Bubuk","category":"Bumbu & Rempah","qty":0.5,"unit":"kg","minStock":0.15,"price":100000},{"id":18,"name":"Esens Vanila & Perisa Kue","category":"Bumbu & Rempah","qty":1,"unit":"liter","minStock":0.3,"price":400000},{"id":19,"name":"Ayam Fillet (Dada)","category":"Daging & Protein","qty":30,"unit":"kg","minStock":10,"price":40000},{"id":20,"name":"Ayam Paha / Ayam Utuh","category":"Daging & Protein","qty":25,"unit":"kg","minStock":8,"price":38000},{"id":21,"name":"Ayam Giling (Dimsum/Wonton)","category":"Daging & Protein","qty":8,"unit":"kg","minStock":3,"price":42000},{"id":22,"name":"Daging Sapi Slice (Teriyaki)","category":"Daging & Protein","qty":10,"unit":"kg","minStock":4,"price":135000},{"id":23,"name":"Daging Sapi Giling (Bolognese/Burger/Lasagna)","category":"Daging & Protein","qty":12,"unit":"kg","minStock":5,"price":110000},{"id":24,"name":"Daging Sapi Sirloin / Ribeye (Steak & Black Pepper)","category":"Daging & Protein","qty":12,"unit":"kg","minStock":5,"price":180000},{"id":25,"name":"Daging Sapi Rendang (Sandung Lamur)","category":"Daging & Protein","qty":10,"unit":"kg","minStock":4,"price":120000},{"id":26,"name":"Iga Sapi (BBQ Ribs)","category":"Daging & Protein","qty":15,"unit":"kg","minStock":6,"price":135000},{"id":27,"name":"Salmon Fillet Segar","category":"Daging & Protein","qty":5,"unit":"kg","minStock":2,"price":220000},{"id":28,"name":"Ikan Dory Fillet","category":"Daging & Protein","qty":10,"unit":"kg","minStock":3,"price":45000},{"id":29,"name":"Ikan Gurame Segar","category":"Daging & Protein","qty":25,"unit":"kg","minStock":8,"price":55000},{"id":30,"name":"Gurita / Octopus","category":"Daging & Protein","qty":4,"unit":"kg","minStock":1.5,"price":95000},{"id":31,"name":"Udang Kupas","category":"Daging & Protein","qty":6,"unit":"kg","minStock":2,"price":90000},{"id":32,"name":"Bakso Sapi","category":"Daging & Protein","qty":10,"unit":"kg","minStock":4,"price":60000},{"id":33,"name":"Smoked Beef / Ham Slice","category":"Daging & Protein","qty":4,"unit":"kg","minStock":1.5,"price":120000},{"id":34,"name":"Telur Ayam","category":"Daging & Protein","qty":300,"unit":"pcs","minStock":90,"price":2500},{"id":35,"name":"Keju Mozzarella","category":"Daging & Protein","qty":8,"unit":"kg","minStock":3,"price":110000},{"id":36,"name":"Keju Cheddar","category":"Daging & Protein","qty":3,"unit":"kg","minStock":1,"price":95000},{"id":37,"name":"Keju Parmesan","category":"Daging & Protein","qty":1.5,"unit":"kg","minStock":0.5,"price":280000},{"id":38,"name":"Cream Cheese & Mascarpone","category":"Daging & Protein","qty":4,"unit":"kg","minStock":1.5,"price":140000},{"id":39,"name":"Mentega / Butter","category":"Daging & Protein","qty":6,"unit":"kg","minStock":2,"price":95000},{"id":40,"name":"Yoghurt Plain","category":"Daging & Protein","qty":8,"unit":"liter","minStock":3,"price":35000},{"id":41,"name":"Bawang Bombay","category":"Sayuran & Buah","qty":10,"unit":"kg","minStock":4,"price":28000},{"id":42,"name":"Wortel","category":"Sayuran & Buah","qty":8,"unit":"kg","minStock":3,"price":15000},{"id":43,"name":"Kentang","category":"Sayuran & Buah","qty":15,"unit":"kg","minStock":5,"price":18000},{"id":44,"name":"Kubis / Kol","category":"Sayuran & Buah","qty":8,"unit":"kg","minStock":3,"price":12000},{"id":45,"name":"Sawi Hijau / Pakcoy","category":"Sayuran & Buah","qty":6,"unit":"kg","minStock":2,"price":15000},{"id":46,"name":"Tauge","category":"Sayuran & Buah","qty":4,"unit":"kg","minStock":1.5,"price":12000},{"id":47,"name":"Paprika Hijau & Merah","category":"Sayuran & Buah","qty":4,"unit":"kg","minStock":1.5,"price":55000},{"id":48,"name":"Brokoli","category":"Sayuran & Buah","qty":4,"unit":"kg","minStock":1.5,"price":40000},{"id":49,"name":"Tomat Segar","category":"Sayuran & Buah","qty":8,"unit":"kg","minStock":3,"price":18000},{"id":50,"name":"Selada (Lettuce)","category":"Sayuran & Buah","qty":3,"unit":"kg","minStock":1,"price":30000},{"id":51,"name":"Timun","category":"Sayuran & Buah","qty":5,"unit":"kg","minStock":2,"price":10000},{"id":52,"name":"Daun Bawang & Seledri","category":"Sayuran & Buah","qty":3,"unit":"kg","minStock":1,"price":25000},{"id":53,"name":"Jamur Champignon","category":"Sayuran & Buah","qty":3,"unit":"kg","minStock":1,"price":55000},{"id":54,"name":"Daun Basil Segar","category":"Sayuran & Buah","qty":0.8,"unit":"kg","minStock":0.3,"price":80000},{"id":55,"name":"Nanas","category":"Sayuran & Buah","qty":4,"unit":"kg","minStock":1.5,"price":15000},{"id":56,"name":"Lemon","category":"Sayuran & Buah","qty":4,"unit":"kg","minStock":1.5,"price":40000},{"id":57,"name":"Jeruk Nipis","category":"Sayuran & Buah","qty":2,"unit":"kg","minStock":0.8,"price":25000},{"id":58,"name":"Mangga","category":"Sayuran & Buah","qty":10,"unit":"kg","minStock":4,"price":28000},{"id":59,"name":"Stroberi (Segar/Beku)","category":"Sayuran & Buah","qty":6,"unit":"kg","minStock":2.5,"price":95000},{"id":60,"name":"Beras Putih","category":"Beras & Sembako","qty":60,"unit":"kg","minStock":20,"price":15000},{"id":61,"name":"Beras Basmati","category":"Beras & Sembako","qty":12,"unit":"kg","minStock":4,"price":55000},{"id":62,"name":"Mie Telur Kuning","category":"Beras & Sembako","qty":12,"unit":"kg","minStock":4,"price":22000},{"id":63,"name":"Mie Ramen","category":"Beras & Sembako","qty":8,"unit":"kg","minStock":3,"price":45000},{"id":64,"name":"Pasta Spaghetti","category":"Beras & Sembako","qty":12,"unit":"kg","minStock":4,"price":28000},{"id":65,"name":"Pasta Fettuccine","category":"Beras & Sembako","qty":5,"unit":"kg","minStock":2,"price":40000},{"id":66,"name":"Lembar Lasagna","category":"Beras & Sembako","qty":4,"unit":"kg","minStock":1.5,"price":45000},{"id":67,"name":"Tepung Terigu Serbaguna","category":"Beras & Sembako","qty":25,"unit":"kg","minStock":8,"price":13000},{"id":68,"name":"Tepung Panir / Panko","category":"Beras & Sembako","qty":6,"unit":"kg","minStock":2,"price":35000},{"id":69,"name":"Tepung Maizena","category":"Beras & Sembako","qty":6,"unit":"kg","minStock":2,"price":18000},{"id":70,"name":"Tepung Ketan","category":"Beras & Sembako","qty":3,"unit":"kg","minStock":1,"price":20000},{"id":71,"name":"Tepung Almond","category":"Beras & Sembako","qty":2,"unit":"kg","minStock":0.7,"price":260000},{"id":72,"name":"Baking Powder & Ragi Instan","category":"Beras & Sembako","qty":1,"unit":"kg","minStock":0.3,"price":60000},{"id":73,"name":"Gula Pasir","category":"Beras & Sembako","qty":25,"unit":"kg","minStock":8,"price":17000},{"id":74,"name":"Minyak Goreng","category":"Beras & Sembako","qty":50,"unit":"liter","minStock":18,"price":18000},{"id":75,"name":"Kecap Manis","category":"Beras & Sembako","qty":10,"unit":"liter","minStock":3,"price":25000},{"id":76,"name":"Kecap Asin / Shoyu","category":"Beras & Sembako","qty":8,"unit":"liter","minStock":2.5,"price":40000},{"id":77,"name":"Saus Tiram","category":"Beras & Sembako","qty":6,"unit":"liter","minStock":2,"price":45000},{"id":78,"name":"Saus Tomat","category":"Beras & Sembako","qty":8,"unit":"liter","minStock":3,"price":20000},{"id":79,"name":"Saus Sambal","category":"Beras & Sembako","qty":5,"unit":"liter","minStock":2,"price":22000},{"id":80,"name":"Saus Teriyaki","category":"Beras & Sembako","qty":6,"unit":"liter","minStock":2,"price":55000},{"id":81,"name":"Saus BBQ","category":"Beras & Sembako","qty":6,"unit":"liter","minStock":2,"price":50000},{"id":82,"name":"Saus Tomat Pasta (Passata)","category":"Beras & Sembako","qty":12,"unit":"liter","minStock":5,"price":45000},{"id":83,"name":"Cuka Beras & Mirin","category":"Beras & Sembako","qty":3,"unit":"liter","minStock":1,"price":60000},{"id":84,"name":"Mayones","category":"Beras & Sembako","qty":6,"unit":"liter","minStock":2,"price":38000},{"id":85,"name":"Santan Kelapa","category":"Beras & Sembako","qty":12,"unit":"liter","minStock":4,"price":30000},{"id":86,"name":"Kacang Tanah","category":"Beras & Sembako","qty":5,"unit":"kg","minStock":2,"price":35000},{"id":87,"name":"Nori / Rumput Laut Lembar","category":"Beras & Sembako","qty":150,"unit":"pcs","minStock":50,"price":1500},{"id":88,"name":"Kulit Dimsum / Wonton","category":"Beras & Sembako","qty":5,"unit":"kg","minStock":2,"price":55000},{"id":89,"name":"Kulit Samosa / Pastry","category":"Beras & Sembako","qty":4,"unit":"kg","minStock":1.5,"price":50000},{"id":90,"name":"Kentang Goreng Beku (French Fries)","category":"Beras & Sembako","qty":15,"unit":"kg","minStock":6,"price":38000},{"id":91,"name":"Roti Burger (Bun)","category":"Beras & Sembako","qty":60,"unit":"pcs","minStock":20,"price":4000},{"id":92,"name":"Biskuit Savoiardi (Tiramisu)","category":"Beras & Sembako","qty":2,"unit":"kg","minStock":0.7,"price":120000},{"id":93,"name":"Biskuit Graham (Dasar Cheesecake)","category":"Beras & Sembako","qty":3,"unit":"kg","minStock":1,"price":50000},{"id":94,"name":"Biskuit Cokelat Remah (Cookies)","category":"Beras & Sembako","qty":2,"unit":"kg","minStock":0.7,"price":60000},{"id":95,"name":"Kotak Makan Take Away","category":"Kemasan / Operasional","qty":300,"unit":"pcs","minStock":100,"price":1800},{"id":96,"name":"Sendok & Garpu Plastik (Set)","category":"Kemasan / Operasional","qty":400,"unit":"pcs","minStock":120,"price":300},{"id":97,"name":"Paper Bag","category":"Kemasan / Operasional","qty":200,"unit":"pcs","minStock":60,"price":1000},{"id":98,"name":"Cup Plastik 16 oz + Tutup","category":"Kemasan / Operasional","qty":400,"unit":"pcs","minStock":120,"price":1200},{"id":99,"name":"Cup Kertas Panas 8 oz + Tutup","category":"Kemasan / Operasional","qty":300,"unit":"pcs","minStock":100,"price":1500},{"id":100,"name":"Cup Es Krim + Sendok Kecil","category":"Kemasan / Operasional","qty":200,"unit":"pcs","minStock":60,"price":700},{"id":101,"name":"Sedotan","category":"Kemasan / Operasional","qty":600,"unit":"pcs","minStock":200,"price":150},{"id":102,"name":"Tisu Makan (Pack)","category":"Kemasan / Operasional","qty":40,"unit":"pack","minStock":12,"price":12000},{"id":103,"name":"Sabun Cuci Piring","category":"Kemasan / Operasional","qty":12,"unit":"liter","minStock":4,"price":25000},{"id":104,"name":"Gas LPG 12 kg","category":"Kemasan / Operasional","qty":8,"unit":"tabung","minStock":3,"price":210000},{"id":105,"name":"Biji Kopi Espresso Blend","category":"Beverage / Coffee","qty":12,"unit":"kg","minStock":4,"price":140000},{"id":106,"name":"Susu Segar Full Cream","category":"Beverage / Coffee","qty":60,"unit":"liter","minStock":20,"price":22000},{"id":107,"name":"Whipping Cream","category":"Beverage / Coffee","qty":10,"unit":"liter","minStock":4,"price":75000},{"id":108,"name":"Bubuk Matcha","category":"Beverage / Coffee","qty":1.0,"unit":"kg","minStock":0.6,"price":380000},{"id":109,"name":"Bubuk Cokelat / Cocoa Powder","category":"Beverage / Coffee","qty":4,"unit":"kg","minStock":1.5,"price":120000},{"id":110,"name":"Dark Chocolate Compound","category":"Beverage / Coffee","qty":6,"unit":"kg","minStock":2,"price":95000},{"id":111,"name":"Sirup Karamel","category":"Beverage / Coffee","qty":4,"unit":"liter","minStock":1.5,"price":85000},{"id":112,"name":"Sirup Gula (Simple Syrup)","category":"Beverage / Coffee","qty":10,"unit":"liter","minStock":4,"price":25000},{"id":113,"name":"Thai Tea Mix","category":"Beverage / Coffee","qty":3,"unit":"kg","minStock":1,"price":120000},{"id":114,"name":"Teh Hitam","category":"Beverage / Coffee","qty":3,"unit":"kg","minStock":1,"price":90000},{"id":115,"name":"Es Batu","category":"Beverage / Coffee","qty":100,"unit":"kg","minStock":40,"price":3000},{"id":116,"name":"Air Mineral Botol 600 ml","category":"Beverage / Coffee","qty":120,"unit":"pcs","minStock":40,"price":3000},{"id":117,"name":"Es Krim Vanilla","category":"Beverage / Coffee","qty":12,"unit":"liter","minStock":4,"price":45000},{"id":118,"name":"Es Krim Cokelat","category":"Beverage / Coffee","qty":12,"unit":"liter","minStock":4,"price":45000},{"id":119,"name":"Es Krim Strawberry","category":"Beverage / Coffee","qty":12,"unit":"liter","minStock":4,"price":45000},{"id":120,"name":"Es Krim Matcha","category":"Beverage / Coffee","qty":8,"unit":"liter","minStock":3,"price":55000},{"id":121,"name":"Es Krim Cookies & Cream","category":"Beverage / Coffee","qty":8,"unit":"liter","minStock":3,"price":50000}];
    const MENU_RECIPE_V3 = {"Chicken Katsu":[{"stockId":19,"qty":0.15},{"stockId":68,"qty":0.05},{"stockId":34,"qty":0.5},{"stockId":67,"qty":0.02},{"stockId":74,"qty":0.08},{"stockId":60,"qty":0.15},{"stockId":44,"qty":0.04},{"stockId":78,"qty":0.015},{"stockId":75,"qty":0.01},{"stockId":8,"qty":0.003},{"stockId":9,"qty":0.001},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Salmon Sushi":[{"stockId":27,"qty":0.08},{"stockId":60,"qty":0.12},{"stockId":83,"qty":0.02},{"stockId":87,"qty":1},{"stockId":16,"qty":0.01},{"stockId":76,"qty":0.015},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Ramen":[{"stockId":19,"qty":0.1},{"stockId":63,"qty":0.12},{"stockId":15,"qty":0.01},{"stockId":14,"qty":0.01},{"stockId":34,"qty":1},{"stockId":52,"qty":0.01},{"stockId":76,"qty":0.02},{"stockId":87,"qty":0.5},{"stockId":46,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Beef Teriyaki":[{"stockId":22,"qty":0.13},{"stockId":80,"qty":0.04},{"stockId":60,"qty":0.15},{"stockId":48,"qty":0.05},{"stockId":42,"qty":0.03},{"stockId":41,"qty":0.03},{"stockId":74,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Japanese Curry Rice":[{"stockId":12,"qty":0.04},{"stockId":19,"qty":0.1},{"stockId":60,"qty":0.15},{"stockId":43,"qty":0.08},{"stockId":42,"qty":0.05},{"stockId":41,"qty":0.05},{"stockId":74,"qty":0.015},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Takoyaki":[{"stockId":30,"qty":0.04},{"stockId":67,"qty":0.07},{"stockId":34,"qty":0.5},{"stockId":44,"qty":0.03},{"stockId":52,"qty":0.01},{"stockId":80,"qty":0.02},{"stockId":84,"qty":0.02},{"stockId":15,"qty":0.005},{"stockId":74,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Yakitori":[{"stockId":19,"qty":0.15},{"stockId":80,"qty":0.03},{"stockId":52,"qty":0.03},{"stockId":74,"qty":0.01},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Sweet and Sour Chicken":[{"stockId":19,"qty":0.15},{"stockId":69,"qty":0.03},{"stockId":67,"qty":0.03},{"stockId":34,"qty":0.3},{"stockId":47,"qty":0.05},{"stockId":55,"qty":0.05},{"stockId":41,"qty":0.03},{"stockId":78,"qty":0.05},{"stockId":73,"qty":0.02},{"stockId":74,"qty":0.1},{"stockId":60,"qty":0.15},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Kung Pao Chicken":[{"stockId":19,"qty":0.15},{"stockId":86,"qty":0.03},{"stockId":47,"qty":0.05},{"stockId":5,"qty":0.02},{"stockId":77,"qty":0.03},{"stockId":76,"qty":0.015},{"stockId":1,"qty":0.01},{"stockId":69,"qty":0.015},{"stockId":60,"qty":0.15},{"stockId":74,"qty":0.04},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Beef Black Pepper":[{"stockId":24,"qty":0.13},{"stockId":9,"qty":0.005},{"stockId":41,"qty":0.05},{"stockId":47,"qty":0.04},{"stockId":77,"qty":0.03},{"stockId":75,"qty":0.02},{"stockId":60,"qty":0.15},{"stockId":74,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Yangzhou Fried Rice":[{"stockId":60,"qty":0.2},{"stockId":34,"qty":1},{"stockId":31,"qty":0.04},{"stockId":33,"qty":0.03},{"stockId":42,"qty":0.03},{"stockId":52,"qty":0.01},{"stockId":76,"qty":0.01},{"stockId":74,"qty":0.03},{"stockId":8,"qty":0.003},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Chow Mein":[{"stockId":62,"qty":0.15},{"stockId":19,"qty":0.1},{"stockId":44,"qty":0.05},{"stockId":42,"qty":0.03},{"stockId":45,"qty":0.05},{"stockId":77,"qty":0.03},{"stockId":76,"qty":0.01},{"stockId":1,"qty":0.01},{"stockId":74,"qty":0.04},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Dimsum":[{"stockId":21,"qty":0.06},{"stockId":31,"qty":0.04},{"stockId":88,"qty":0.04},{"stockId":3,"qty":0.005},{"stockId":52,"qty":0.01},{"stockId":76,"qty":0.01},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Xiao Long Bao":[{"stockId":21,"qty":0.08},{"stockId":88,"qty":0.05},{"stockId":14,"qty":0.02},{"stockId":3,"qty":0.005},{"stockId":52,"qty":0.01},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Wonton Soup":[{"stockId":31,"qty":0.03},{"stockId":21,"qty":0.05},{"stockId":88,"qty":0.04},{"stockId":14,"qty":0.01},{"stockId":45,"qty":0.05},{"stockId":52,"qty":0.01},{"stockId":1,"qty":0.005},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Biryani":[{"stockId":61,"qty":0.15},{"stockId":20,"qty":0.15},{"stockId":40,"qty":0.05},{"stockId":10,"qty":0.01},{"stockId":11,"qty":0.01},{"stockId":41,"qty":0.06},{"stockId":1,"qty":0.01},{"stockId":3,"qty":0.01},{"stockId":39,"qty":0.02},{"stockId":74,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Butter Chicken":[{"stockId":19,"qty":0.15},{"stockId":39,"qty":0.03},{"stockId":107,"qty":0.05},{"stockId":49,"qty":0.1},{"stockId":11,"qty":0.02},{"stockId":10,"qty":0.005},{"stockId":41,"qty":0.04},{"stockId":61,"qty":0.12},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Tikka Masala":[{"stockId":19,"qty":0.15},{"stockId":40,"qty":0.05},{"stockId":11,"qty":0.025},{"stockId":49,"qty":0.08},{"stockId":107,"qty":0.03},{"stockId":41,"qty":0.05},{"stockId":61,"qty":0.12},{"stockId":74,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Tandoori Chicken":[{"stockId":20,"qty":0.3},{"stockId":40,"qty":0.06},{"stockId":11,"qty":0.03},{"stockId":10,"qty":0.005},{"stockId":56,"qty":0.03},{"stockId":1,"qty":0.01},{"stockId":51,"qty":0.03},{"stockId":41,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Samosa":[{"stockId":89,"qty":0.04},{"stockId":43,"qty":0.12},{"stockId":10,"qty":0.005},{"stockId":41,"qty":0.03},{"stockId":74,"qty":0.08},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Beef Steak":[{"stockId":24,"qty":0.2},{"stockId":39,"qty":0.02},{"stockId":90,"qty":0.15},{"stockId":42,"qty":0.04},{"stockId":48,"qty":0.05},{"stockId":9,"qty":0.003},{"stockId":8,"qty":0.003},{"stockId":74,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Spaghetti Bolognese":[{"stockId":64,"qty":0.12},{"stockId":23,"qty":0.1},{"stockId":82,"qty":0.1},{"stockId":41,"qty":0.04},{"stockId":1,"qty":0.01},{"stockId":13,"qty":0.002},{"stockId":37,"qty":0.01},{"stockId":74,"qty":0.015},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Classic Cheeseburger":[{"stockId":91,"qty":1},{"stockId":23,"qty":0.15},{"stockId":36,"qty":0.03},{"stockId":49,"qty":0.04},{"stockId":50,"qty":0.03},{"stockId":41,"qty":0.02},{"stockId":84,"qty":0.02},{"stockId":78,"qty":0.02},{"stockId":90,"qty":0.12},{"stockId":74,"qty":0.04},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Alfredo":[{"stockId":65,"qty":0.12},{"stockId":19,"qty":0.1},{"stockId":107,"qty":0.1},{"stockId":37,"qty":0.02},{"stockId":39,"qty":0.02},{"stockId":1,"qty":0.01},{"stockId":53,"qty":0.04},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Fish and Chips":[{"stockId":28,"qty":0.15},{"stockId":90,"qty":0.2},{"stockId":67,"qty":0.05},{"stockId":69,"qty":0.02},{"stockId":84,"qty":0.03},{"stockId":56,"qty":0.02},{"stockId":74,"qty":0.15},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Margherita Pizza":[{"stockId":67,"qty":0.18},{"stockId":72,"qty":0.003},{"stockId":35,"qty":0.1},{"stockId":82,"qty":0.06},{"stockId":54,"qty":0.005},{"stockId":74,"qty":0.015},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Chicken Cordon Bleu":[{"stockId":19,"qty":0.15},{"stockId":33,"qty":0.03},{"stockId":35,"qty":0.03},{"stockId":68,"qty":0.05},{"stockId":34,"qty":0.5},{"stockId":67,"qty":0.02},{"stockId":90,"qty":0.12},{"stockId":42,"qty":0.03},{"stockId":74,"qty":0.1},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Lasagna":[{"stockId":66,"qty":0.08},{"stockId":23,"qty":0.1},{"stockId":82,"qty":0.1},{"stockId":35,"qty":0.06},{"stockId":106,"qty":0.1},{"stockId":39,"qty":0.02},{"stockId":67,"qty":0.015},{"stockId":41,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"BBQ Ribs":[{"stockId":26,"qty":0.4},{"stockId":81,"qty":0.06},{"stockId":90,"qty":0.15},{"stockId":44,"qty":0.04},{"stockId":84,"qty":0.02},{"stockId":42,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Carbonara Pasta":[{"stockId":64,"qty":0.12},{"stockId":33,"qty":0.05},{"stockId":34,"qty":1},{"stockId":37,"qty":0.025},{"stockId":107,"qty":0.06},{"stockId":9,"qty":0.002},{"stockId":1,"qty":0.01},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Nasi Goreng Special":[{"stockId":60,"qty":0.2},{"stockId":34,"qty":1},{"stockId":19,"qty":0.05},{"stockId":31,"qty":0.03},{"stockId":2,"qty":0.02},{"stockId":1,"qty":0.01},{"stockId":5,"qty":0.015},{"stockId":75,"qty":0.02},{"stockId":74,"qty":0.04},{"stockId":51,"qty":0.03},{"stockId":49,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Nasi Ayam Geprek":[{"stockId":60,"qty":0.2},{"stockId":19,"qty":0.15},{"stockId":67,"qty":0.04},{"stockId":6,"qty":0.03},{"stockId":1,"qty":0.015},{"stockId":74,"qty":0.12},{"stockId":51,"qty":0.03},{"stockId":44,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Nasi Rendang":[{"stockId":60,"qty":0.2},{"stockId":25,"qty":0.13},{"stockId":85,"qty":0.08},{"stockId":7,"qty":0.04},{"stockId":4,"qty":0.01},{"stockId":5,"qty":0.02},{"stockId":74,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Sate Ayam":[{"stockId":19,"qty":0.15},{"stockId":86,"qty":0.04},{"stockId":75,"qty":0.03},{"stockId":2,"qty":0.02},{"stockId":1,"qty":0.01},{"stockId":6,"qty":0.01},{"stockId":60,"qty":0.15},{"stockId":74,"qty":0.01},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Mie Goreng Jawa":[{"stockId":62,"qty":0.18},{"stockId":34,"qty":1},{"stockId":19,"qty":0.05},{"stockId":44,"qty":0.05},{"stockId":45,"qty":0.05},{"stockId":2,"qty":0.02},{"stockId":1,"qty":0.01},{"stockId":75,"qty":0.03},{"stockId":6,"qty":0.01},{"stockId":74,"qty":0.04},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Ayam Penyet":[{"stockId":20,"qty":0.25},{"stockId":60,"qty":0.2},{"stockId":6,"qty":0.03},{"stockId":1,"qty":0.02},{"stockId":49,"qty":0.03},{"stockId":51,"qty":0.03},{"stockId":7,"qty":0.03},{"stockId":74,"qty":0.12},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Soto Ayam":[{"stockId":20,"qty":0.15},{"stockId":60,"qty":0.15},{"stockId":7,"qty":0.04},{"stockId":3,"qty":0.01},{"stockId":4,"qty":0.01},{"stockId":34,"qty":0.5},{"stockId":46,"qty":0.03},{"stockId":52,"qty":0.01},{"stockId":43,"qty":0.03},{"stockId":74,"qty":0.02},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Bakso Special":[{"stockId":32,"qty":0.15},{"stockId":62,"qty":0.08},{"stockId":45,"qty":0.04},{"stockId":46,"qty":0.03},{"stockId":14,"qty":0.01},{"stockId":1,"qty":0.01},{"stockId":52,"qty":0.01},{"stockId":79,"qty":0.02},{"stockId":75,"qty":0.01},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Nasi Liwet":[{"stockId":60,"qty":0.2},{"stockId":85,"qty":0.06},{"stockId":20,"qty":0.12},{"stockId":34,"qty":0.5},{"stockId":7,"qty":0.03},{"stockId":4,"qty":0.01},{"stockId":5,"qty":0.01},{"stockId":74,"qty":0.04},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Gurame Bakar":[{"stockId":29,"qty":0.7},{"stockId":75,"qty":0.04},{"stockId":7,"qty":0.04},{"stockId":57,"qty":0.02},{"stockId":6,"qty":0.02},{"stockId":60,"qty":0.2},{"stockId":51,"qty":0.03},{"stockId":74,"qty":0.03},{"stockId":104,"qty":0.004},{"stockId":102,"qty":0.02},{"stockId":103,"qty":0.005},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Hot Americano":[{"stockId":105,"qty":0.018},{"stockId":99,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Hot Cappuccino":[{"stockId":105,"qty":0.018},{"stockId":106,"qty":0.15},{"stockId":99,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Hot Café Latte":[{"stockId":105,"qty":0.018},{"stockId":106,"qty":0.2},{"stockId":99,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Hot Matcha Latte":[{"stockId":108,"qty":0.01},{"stockId":106,"qty":0.2},{"stockId":112,"qty":0.02},{"stockId":99,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Hot Chocolate":[{"stockId":109,"qty":0.02},{"stockId":110,"qty":0.02},{"stockId":106,"qty":0.2},{"stockId":112,"qty":0.01},{"stockId":99,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Iced Americano":[{"stockId":105,"qty":0.018},{"stockId":115,"qty":0.15},{"stockId":112,"qty":0.01},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Iced Caramel Latte":[{"stockId":105,"qty":0.018},{"stockId":106,"qty":0.15},{"stockId":111,"qty":0.03},{"stockId":115,"qty":0.15},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Iced Matcha Latte":[{"stockId":108,"qty":0.01},{"stockId":106,"qty":0.15},{"stockId":112,"qty":0.02},{"stockId":115,"qty":0.15},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Iced Chocolate":[{"stockId":109,"qty":0.02},{"stockId":110,"qty":0.02},{"stockId":106,"qty":0.15},{"stockId":115,"qty":0.15},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Iced Thai Tea":[{"stockId":113,"qty":0.015},{"stockId":106,"qty":0.08},{"stockId":73,"qty":0.02},{"stockId":115,"qty":0.15},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Iced Lemon Tea":[{"stockId":114,"qty":0.005},{"stockId":56,"qty":0.08},{"stockId":112,"qty":0.03},{"stockId":115,"qty":0.15},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Strawberry Smoothie":[{"stockId":59,"qty":0.12},{"stockId":106,"qty":0.1},{"stockId":40,"qty":0.05},{"stockId":112,"qty":0.02},{"stockId":115,"qty":0.12},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Mango Juice":[{"stockId":58,"qty":0.2},{"stockId":112,"qty":0.02},{"stockId":115,"qty":0.12},{"stockId":98,"qty":1,"mode":"takeaway"},{"stockId":101,"qty":1},{"stockId":97,"qty":0.3,"mode":"takeaway"}],"Air Mineral":[{"stockId":116,"qty":1}],"Chocolate Lava Cake":[{"stockId":110,"qty":0.06},{"stockId":39,"qty":0.04},{"stockId":34,"qty":1},{"stockId":73,"qty":0.04},{"stockId":67,"qty":0.02},{"stockId":109,"qty":0.01},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Tiramisu":[{"stockId":38,"qty":0.08},{"stockId":92,"qty":0.04},{"stockId":34,"qty":1},{"stockId":73,"qty":0.03},{"stockId":105,"qty":0.01},{"stockId":109,"qty":0.005},{"stockId":107,"qty":0.05},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Strawberry Cheesecake":[{"stockId":38,"qty":0.1},{"stockId":93,"qty":0.05},{"stockId":39,"qty":0.03},{"stockId":73,"qty":0.04},{"stockId":59,"qty":0.06},{"stockId":107,"qty":0.04},{"stockId":34,"qty":0.5},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Mochi":[{"stockId":70,"qty":0.06},{"stockId":73,"qty":0.03},{"stockId":69,"qty":0.01},{"stockId":18,"qty":0.002},{"stockId":59,"qty":0.02},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Macarons":[{"stockId":71,"qty":0.05},{"stockId":73,"qty":0.06},{"stockId":34,"qty":1},{"stockId":39,"qty":0.03},{"stockId":18,"qty":0.002},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Belgian Waffle":[{"stockId":67,"qty":0.1},{"stockId":34,"qty":1},{"stockId":106,"qty":0.15},{"stockId":39,"qty":0.04},{"stockId":73,"qty":0.03},{"stockId":72,"qty":0.005},{"stockId":59,"qty":0.03},{"stockId":107,"qty":0.03},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Churros":[{"stockId":67,"qty":0.1},{"stockId":34,"qty":0.5},{"stockId":73,"qty":0.04},{"stockId":17,"qty":0.005},{"stockId":39,"qty":0.02},{"stockId":74,"qty":0.15},{"stockId":110,"qty":0.03},{"stockId":102,"qty":0.01},{"stockId":103,"qty":0.003},{"stockId":95,"qty":1,"mode":"takeaway"},{"stockId":96,"qty":1,"mode":"takeaway"},{"stockId":97,"qty":0.5,"mode":"takeaway"}],"Vanilla Ice Cream":[{"stockId":117,"qty":0.15},{"stockId":100,"qty":1,"mode":"takeaway"}],"Chocolate Ice Cream":[{"stockId":118,"qty":0.15},{"stockId":100,"qty":1,"mode":"takeaway"}],"Strawberry Ice Cream":[{"stockId":119,"qty":0.15},{"stockId":100,"qty":1,"mode":"takeaway"}],"Matcha Ice Cream":[{"stockId":120,"qty":0.15},{"stockId":100,"qty":1,"mode":"takeaway"}],"Cookies and Cream":[{"stockId":121,"qty":0.15},{"stockId":94,"qty":0.01},{"stockId":100,"qty":1,"mode":"takeaway"}]};

    function defaultIngredientsFor(menuName) {
      const k = normMenuName(menuName);
      for (const n in MENU_RECIPE_V3) { if (normMenuName(n) === k) return JSON.parse(JSON.stringify(MENU_RECIPE_V3[n])); }
      return [];
    }

    function normalizeStockCategory(cat, name) {
      if (STOCK_CATEGORIES.includes(cat)) return cat;
      const c = String(cat || '').toLowerCase();
      const n = String(name || '').toLowerCase();
      if (/bumbu|rempah/.test(c)) return 'Bumbu & Rempah';
      if (/daging|protein/.test(c)) return 'Daging & Protein';
      if (/sayur|buah/.test(c)) return 'Sayuran & Buah';
      if (/beras|sembako|semabako/.test(c)) return 'Beras & Sembako';
      if (/kemasan|operasi|packag/.test(c)) return 'Kemasan / Operasional';
      if (/beverage|coffee|kopi|minuman|dairy|dessert/.test(c)) return 'Beverage / Coffee';
      // kategori lama berbasis jenis masakan -> tebak dari nama bahan
      if (/kotak|cup|kemasan|plastik|tisu|sedotan|gas|sabun|paper bag/.test(n)) return 'Kemasan / Operasional';
      if (/kopi|teh|susu|matcha|cokelat|coklat|es krim|jus|sirup|air mineral/.test(n)) return 'Beverage / Coffee';
      if (/daging|ayam|sapi|ikan|salmon|telur|udang|keju|bakso|gurita|dory|iga|yoghurt|mentega/.test(n)) return 'Daging & Protein';
      if (/sayur|buah|bawang bombay|tomat|wortel|kentang|kol|sawi|lemon|mangga|stroberi|nanas|timun|jamur|brokoli/.test(n)) return 'Sayuran & Buah';
      if (/bumbu|rempah|garam|lada|kaldu|cabai|bawang|jahe|kunyit|serai/.test(n)) return 'Bumbu & Rempah';
      return 'Beras & Sembako';
    }

    // Bangun ulang daftar bahan baku + resep sesuai 66 menu, lalu hitung ulang pemotongan stok dari transaksi tercatat
    function rebuildStockFromMenus() {
      stockData = STOCK_MASTER_V3.map(s => Object.assign({}, s));
      recipeData.forEach(r => { r.ingredients = defaultIngredientsFor(r.menuName); });
      saveProcessedKeys(new Set());
      (rawData || []).forEach(t => { t.processedStock = false; });
      deductStockOnTransaction();
      saveStockToStorage();
      try { saveRawDataToStorage(); } catch (e) {}
      localStorage.setItem(STOCK_SYNC_FLAG, '1');
    }

    // Sekali jalan per data tersimpan: ganti daftar bahan lama dengan daftar bahan sesuai menu.
    function ensureStockMenuSync() {
      if (localStorage.getItem(STOCK_SYNC_FLAG) !== '1') { rebuildStockFromMenus(); return true; }
      let changed = false;
      stockData.forEach(s => {
        const nc = normalizeStockCategory(s.category, s.name);
        if (nc !== s.category) { s.category = nc; changed = true; }
      });
      if (changed) saveStockToStorage();
      return false;
    }

    const DEFAULT_HPP_RATIO = { 'japanese': .36, 'chinese': .34, 'indian': .35, 'western': .34, 'indonesian': .32,
      'hot drinks': .22, 'ice drinks': .24, 'dessert & snacks': .30, 'ice cream': .28 };

    function normMenuName(n) { return String(n || '').toLocaleLowerCase().replace(/[^a-z0-9]/g, ''); }
    function defaultMarginForCategory(cat) {
      const key = String(cat || '').toLowerCase().replace(/\s*food$/, '').trim();
      const ratio = DEFAULT_HPP_RATIO[key] ?? 0.35;
      return (1 - ratio) * 100;
    }
    function readJSONKey(key, fallback) {
      try { const v = JSON.parse(localStorage.getItem(key) || ''); return v ?? fallback; } catch (e) { return fallback; }
    }

    /* Menambah / memperbarui daftar menu di Kelola Margin.
       items: [{name, cat, price, hpp?}]. Jika hpp diberikan & applyHpp=true, margin dihitung dari HPP tsb. */
    function upsertMenuMasters(items, opts) {
      opts = opts || {};
      let extras = readJSONKey('resto_sim_extra_margin_menus', []);
      let hidden = getHiddenMarginMenus();
      let added = 0, priceChanged = 0;
      items.forEach(it => {
        const key = normMenuName(it.name);
        if (!key) return;
        const price = Number(it.price) || 0;
        // harga jual & kategori
        const ex = extras.find(m => m && normMenuName(m.name) === key);
        if (ex) { if (price && Number(ex.price) !== price) priceChanged++; if (price) ex.price = price; if (it.cat) ex.cat = it.cat; }
        else extras.push({ name: it.name, cat: it.cat || 'Umum', price });
        if (opts.unhide) hidden = hidden.filter(h => normMenuName(h) !== key);
        // margin / HPP
        let r = recipeData.find(x => normMenuName(x.menuName) === key);
        const marginFromHpp = (it.hpp !== undefined && price > 0) ? Math.min(99, Math.max(0, (price - it.hpp) / price * 100)) : null;
        if (!r) {
          if (hidden.some(h => normMenuName(h) === key)) return;
          recipeData.push({ id: Date.now() + Math.floor(Math.random() * 100000), menuName: it.name, category: it.cat || 'Umum',
            ingredients: defaultIngredientsFor(it.name), marginPercent: marginFromHpp !== null ? marginFromHpp : defaultMarginForCategory(it.cat) });
          added++;
        } else {
          if (it.cat) r.category = it.cat;
          if (opts.applyHpp && marginFromHpp !== null) { r.marginPercent = marginFromHpp; delete r.manualHpp; }
        }
      });
      localStorage.setItem('resto_sim_extra_margin_menus', JSON.stringify(extras));
      localStorage.setItem('resto_sim_hidden_margin_menus', JSON.stringify(hidden));
      saveRecipesToStorage();
      return { added, priceChanged };
    }

    // Pastikan 66 menu POS ada di Kelola Margin lengkap dengan harga pokoknya (sekali jalan per data tersimpan).
    function ensurePosMenusInMargin() {
      if (localStorage.getItem(HPP_SYNC_FLAG) === '1') return;
      const masterKeys = new Set(POS_MENU_MASTER.map(m => normMenuName(m.n)));
      // Menu lama yang bukan bagian dari POS dan tidak pernah terjual dibersihkan (mis. "Strawberry Chocolate")
      recipeData = recipeData.filter(r => {
        const k = normMenuName(r.menuName);
        if (masterKeys.has(k)) return true;
        const sold = (rawData || []).some(d => normMenuName(d.Produk) === k);
        const isLegacyDefault = ['strawberrychocolate'].includes(k);
        return !(isLegacyDefault && !sold);
      });
      let extras = readJSONKey('resto_sim_extra_margin_menus', []).filter(m => m && (masterKeys.has(normMenuName(m.name)) || normMenuName(m.name) !== 'strawberrychocolate'));
      localStorage.setItem('resto_sim_extra_margin_menus', JSON.stringify(extras));
      upsertMenuMasters(POS_MENU_MASTER.map(m => ({ name: m.n, cat: m.c, price: m.p, hpp: m.h })), { applyHpp: true, unhide: true });
      // urutkan sesuai urutan menu di POS (menu lain tetap di bawah)
      const order = {}; POS_MENU_MASTER.forEach((m, i) => order[normMenuName(m.n)] = i);
      recipeData.sort((x, y) => (order[normMenuName(x.menuName)] ?? 9999) - (order[normMenuName(y.menuName)] ?? 9999));
      saveRecipesToStorage();
      localStorage.setItem(HPP_SYNC_FLAG, '1');
    }

    // Organization Initial Data
    let orgMembers = [
      { id: 1, name: "Ni Luh Sri Sudariani", role: "Ketua Tim & Manajer SIM", level: "Pimpinan", photo: "" },
      { id: 2, name: "Putu Sintya", role: "Manajer Keuangan Resto", level: "Manajer", photo: "" },
      { id: 3, name: "Gusti Ayu Kade Puri Intan Apriliani", role: "Manajer Operasional Resto", level: "Anggota", photo: "" }
    ];

    // Expenses Initial Data
    let expenseData = [
      { id: 1, date: "2026-11-01", category: "Bahan Baku Utama", desc: "Pembelian Ayam Fillet 25kg & Daging Sapi 10kg", amount: 1850000 },
      { id: 2, date: "2026-11-02", category: "Bumbu & Minyak", desc: "Minyak Goreng 50L & Rempah Resto", amount: 650000 },
      { id: 3, date: "2026-11-03", category: "Utilitas (Listrik, Air, Gas)", desc: "Pembelian Tabung Gas LPG 12kg (4 kaleng)", amount: 840000 },
      { id: 4, date: "2026-11-04", category: "Kemasan & Packaging", desc: "Kotak Nasi Takeaway, Thinwall, & Paper Bag", amount: 450000 },
      { id: 5, date: "2026-11-05", category: "Gaji & Uang Makan Staf", desc: "Uang Makan & Insentif Mingguan Staf Dapur", amount: 1200000 }
    ];

    // Stock / Inventory Initial Data
    let stockData = [
      {
            "id": 1,
            "name": "Daging Ayam Fillet (Katsu, Ramen, Yakitori)",
            "category": "Japanese Food",
            "qty": 25.0,
            "unit": "kg",
            "minStock": 10,
            "price": 40000
      },
      {
            "id": 2,
            "name": "Daging Sapi Slice (Beef Teriyaki & Curry)",
            "category": "Japanese Food",
            "qty": 4.2,
            "unit": "kg",
            "minStock": 8,
            "price": 135000
      },
      {
            "id": 3,
            "name": "Beras Basmati & Rempah Biryani / Tikka Masala",
            "category": "Indian Food",
            "qty": 14.0,
            "unit": "kg",
            "minStock": 6,
            "price": 55000
      },
      {
            "id": 4,
            "name": "Minyak Goreng Sawit",
            "category": "Bumbu & Rempah",
            "qty": 8.0,
            "unit": "liter",
            "minStock": 15,
            "price": 17500
      },
      {
            "id": 5,
            "name": "Salmon Fresh Grade (Salmon Sushi)",
            "category": "Japanese Food",
            "qty": 3.5,
            "unit": "kg",
            "minStock": 5,
            "price": 220000
      },
      {
            "id": 6,
            "name": "Daging Gurita & Tepung Takoyaki",
            "category": "Japanese Food",
            "qty": 8.0,
            "unit": "kg",
            "minStock": 4,
            "price": 75000
      },
      {
            "id": 7,
            "name": "Telur Ayam Negeri",
            "category": "Daging & Protein",
            "qty": 15.0,
            "unit": "kg",
            "minStock": 5,
            "price": 28000
      },
      {
            "id": 8,
            "name": "Ramen Noodle & Kuah Dashi/Shoyu",
            "category": "Japanese Food",
            "qty": 15.0,
            "unit": "pack",
            "minStock": 6,
            "price": 35000
      },
      {
            "id": 9,
            "name": "Kulit & Isian Dimsum / Xiao Long Bao / Wonton",
            "category": "Chinese Food",
            "qty": 18.5,
            "unit": "kg",
            "minStock": 8,
            "price": 65000
      },
      {
            "id": 10,
            "name": "Saus Asam Manis & Lada Hitam (Kung Pao/Beef)",
            "category": "Chinese Food",
            "qty": 9.0,
            "unit": "botol",
            "minStock": 4,
            "price": 45000
      },
      {
            "id": 11,
            "name": "Kulit Samosa & Isian Kentang Rempah",
            "category": "Indian Food",
            "qty": 6.0,
            "unit": "pack",
            "minStock": 3,
            "price": 30000
      },
      {
            "id": 12,
            "name": "Daging Ribeye/Sirloin (Beef Steak & BBQ Ribs)",
            "category": "Western Food",
            "qty": 5.5,
            "unit": "kg",
            "minStock": 10,
            "price": 180000
      },
      {
            "id": 13,
            "name": "Pasta Dry (Spaghetti, Alfredo, Penne, Lasagna)",
            "category": "Western Food",
            "qty": 22.0,
            "unit": "kg",
            "minStock": 8,
            "price": 28000
      },
      {
            "id": 14,
            "name": "Dory Fillet & Kentang Goreng (Fish and Chips)",
            "category": "Western Food",
            "qty": 12.0,
            "unit": "kg",
            "minStock": 5,
            "price": 45000
      },
      {
            "id": 15,
            "name": "Keju Mozzarella & Dough Pizza Margherita",
            "category": "Western Food",
            "qty": 4.8,
            "unit": "kg",
            "minStock": 7,
            "price": 110000
      },
      {
            "id": 16,
            "name": "Bumbu Rempah Basah (Rendang, Soto, Liwet)",
            "category": "Indonesian Food",
            "qty": 16.0,
            "unit": "kg",
            "minStock": 6,
            "price": 35000
      },
      {
            "id": 17,
            "name": "Bakso Sapi & Kuah Kaldu Special",
            "category": "Indonesian Food",
            "qty": 10.0,
            "unit": "kg",
            "minStock": 5,
            "price": 60000
      },
      {
            "id": 18,
            "name": "Biji Kopi Espresso Blend (Americano & Latte)",
            "category": "Beverage & Coffee",
            "qty": 18.5,
            "unit": "kg",
            "minStock": 6,
            "price": 140000
      },
      {
            "id": 19,
            "name": "Bubuk Matcha & Chocolate Powder",
            "category": "Beverage & Coffee",
            "qty": 1.8,
            "unit": "kg",
            "minStock": 4,
            "price": 160000
      },
      {
            "id": 20,
            "name": "Es Krim Tub (Vanilla, Chocolate, Strawberry, Matcha)",
            "category": "Dessert",
            "qty": 16.0,
            "unit": "tub",
            "minStock": 6,
            "price": 48000
      }
];

    // Standard Recipes Initial Data
    let recipeData = [
      {
        id: 1,
        menuName: "Nasi Goreng Spesial Resto",
        category: "Makanan Utama",
        ingredients: [
          { stockId: 3, qty: 0.15 },
          { stockId: 7, qty: 0.06 },
          { stockId: 4, qty: 0.02 }
        ]
      },
      {
        id: 2,
        menuName: "Ayam Bakar Madu + Nasi",
        category: "Makanan Utama",
        ingredients: [
          { stockId: 1, qty: 0.20 },
          { stockId: 3, qty: 0.15 },
          { stockId: 4, qty: 0.01 }
        ]
      }
    ];

    /* SECURITY & HELPER FUNCTIONS */
    async function verifyAdminPIN() {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.id = 'admin-pin-auth-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.62);z-index:999999;display:flex;align-items:center;justify-content:center;padding:18px;';
        overlay.innerHTML = `
          <div style="width:min(420px,100%);background:var(--card-bg,#fff);color:var(--text-color,#222);border-radius:16px;padding:22px;box-shadow:0 18px 60px rgba(0,0,0,.3);">
            <h3 style="margin:0 0 8px;font-size:1.1rem;">🔐 Verifikasi Kata Sandi</h3>
            <p style="margin:0 0 14px;font-size:.9rem;color:var(--text-muted,#666);">Masukkan kata sandi untuk melanjutkan.</p>
            <input id="admin-pin-auth-input" type="password" autocomplete="current-password" placeholder="Masukkan kata sandi"
              style="box-sizing:border-box;width:100%;padding:12px;border:1px solid var(--border-color,#ccc);border-radius:9px;background:var(--input-bg,#fff);color:inherit;font-size:1rem;">
            <div id="admin-pin-auth-error" style="min-height:20px;color:#dc2626;font-size:.82rem;margin-top:6px;"></div>
            <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:10px;">
              <button type="button" id="admin-pin-auth-cancel" class="btn btn-outline">Batal</button>
              <button type="button" id="admin-pin-auth-submit" class="btn btn-primary">Konfirmasi</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#admin-pin-auth-input');
        const error = overlay.querySelector('#admin-pin-auth-error');
        const finish = value => { overlay.remove(); resolve(value); };
        const submit = () => {
          if (input.value.trim() === String(adminPin)) finish(true);
          else { error.textContent = 'Kata sandi salah. Silakan coba lagi.'; input.value=''; input.focus(); }
        };
        overlay.querySelector('#admin-pin-auth-submit').addEventListener('click', submit);
        overlay.querySelector('#admin-pin-auth-cancel').addEventListener('click', () => finish(false));
        input.addEventListener('keydown', e => {
          if (e.key === 'Enter') submit();
          if (e.key === 'Escape') finish(false);
        });
        overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
        setTimeout(() => input.focus(), 0);
      });
    }

    async function protectedAction(actionCallback) {
      if (await verifyAdminPIN()) return actionCallback();
      return false;
    }

    function escapeHTML(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function formatRp(num) {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num || 0);
    }

    function formatShortRp(num) {
      if (Math.abs(num) >= 1e9) return (num / 1e9).toFixed(2) + ' M';
      if (Math.abs(num) >= 1e6) return (num / 1e6).toFixed(1) + ' jt';
      return formatRp(num);
    }

    /* KELOLA STANDAR RESEP & PERHITUNGAN HPP MODAL */
    function saveRecipesToStorage() {
      localStorage.setItem('resto_sim_recipes', JSON.stringify(recipeData));
      const localRaw = localStorage.getItem('resto_pos_sim_app_data');
      if (localRaw) {
        try {
          const appData = JSON.parse(localRaw);
          appData.recipes = recipeData;
          appData.ingredientsStock = stockData;
          localStorage.setItem('resto_pos_sim_app_data', JSON.stringify(appData));
        } catch(e){}
      }
    }

    function loadRecipesFromStorage() {
      const saved = localStorage.getItem('resto_sim_recipes');
      if (saved) {
        try { recipeData = JSON.parse(saved); } catch(e){}
      }
    }

    // Cari resep berdasarkan nama menu secara toleran (abaikan spasi dan huruf besar/kecil).
    // Ini memastikan HPP manual tetap terbaca saat nama pada data transaksi sedikit berbeda format.
    function findRecipeForMenu(menuName) {
      const target = String(menuName || '').trim().toLocaleLowerCase();
      if (!target) return null;
      return recipeData.find(r => String(r.menuName || '').trim().toLocaleLowerCase() === target)
        || recipeData.find(r => normMenuName(r.menuName) === normMenuName(menuName)) || null;
    }

    function getMenuSellingPrice(recipe) {
      if (!recipe) return 0;
      const name = String(recipe.menuName || '').trim().toLocaleLowerCase();
      const localRaw = localStorage.getItem('resto_pos_sim_app_data');
      if (localRaw) {
        try {
          const appData = JSON.parse(localRaw);
          const product = (appData.products || []).find(p => String(p.name || '').trim().toLocaleLowerCase() === name);
          if (product) return Number(product.price) || 0;
        } catch (e) {}
      }
      try {
        const extras = JSON.parse(localStorage.getItem('resto_sim_extra_margin_menus') || '[]');
        const extra = extras.find(m => m && String(m.name || '').trim().toLocaleLowerCase() === name);
        if (extra) return Number(extra.price) || 0;
      } catch (e) {}
      const trx = (rawData || []).find(d => String(d.Produk || '').trim().toLocaleLowerCase() === name);
      return trx ? (Number(trx.Harga_Satuan) || 0) : 0;
    }

    // Rumus sesuai ketentuan: Untung = Harga Jual x Margin%; HPP = Harga Jual - Untung.
    function calculateMenuHPP(recipe, sellingPrice) {
      if (!recipe) return 0;
      const price = Number.isFinite(Number(sellingPrice)) ? Number(sellingPrice) : getMenuSellingPrice(recipe);
      const margin = Math.min(99, Math.max(0, Number(recipe.marginPercent ?? 40)));
      const profit = price * margin / 100;
      return Math.max(0, Math.round(price - profit));
    }

    function deductStockOnTransaction() {
      if (!rawData || rawData.length === 0) return;

      let updatedAny = false;
      const done = loadProcessedKeys();

      rawData.forEach(trx => {
        const key = trxKey(trx);
        if (!trx.processedStock && !done.has(key)) {
          const menuName = trx.Produk;
          const qtySold = trx.Jumlah || 1;

          const recipe = findRecipeForMenu(menuName);
          if (recipe && recipe.ingredients) {
            const isTakeAway = /take/i.test(String(trx.OrderType || ''));
            recipe.ingredients.forEach(ing => {
              if (ing.mode === 'takeaway' && !isTakeAway) return; // kemasan take away hanya untuk pesanan Take Away
              const stockItem = stockData.find(s => s.id === parseInt(ing.stockId));
              if (stockItem) {
                const deduction = ing.qty * qtySold;
                stockItem.qty = Math.max(0, parseFloat((stockItem.qty - deduction).toFixed(3)));
                updatedAny = true;
              }
            });
          }
          done.add(key);
        }
        trx.processedStock = true;
      });

      saveProcessedKeys(done);
      if (updatedAny) {
        saveStockToStorage();
      }
    }

    function getHiddenMarginMenus() {
      try { return JSON.parse(localStorage.getItem('resto_sim_hidden_margin_menus') || '[]'); }
      catch (e) { return []; }
    }

    function renderRecipeModule() {
      // Data resep tetap dipakai di belakang layar untuk perhitungan HPP dan stok.
      // Kelola Margin hanya menampilkan menu, harga jual, margin, untung, dan HPP.
      let menuList = [];
      const localRaw = localStorage.getItem('resto_pos_sim_app_data');
      if (localRaw) {
        try {
          const appData = JSON.parse(localRaw);
          if (appData.products && appData.products.length > 0) {
            appData.products.forEach(p => menuList.push({ name: p.name, cat: p.category, price: p.price }));
          }
        } catch(e){}
      }
      if (rawData && rawData.length > 0) {
        rawData.forEach(d => {
          if (!menuList.some(m => m.name === d.Produk)) {
            menuList.push({ name: d.Produk, cat: d.Kategori, price: d.Harga_Satuan });
          }
        });
      }
      // Menu tambahan khusus Kelola Margin disimpan terpisah dari data kasir.
      let extraMarginMenus = [];
      try { extraMarginMenus = JSON.parse(localStorage.getItem('resto_sim_extra_margin_menus') || '[]'); }
      catch (e) { extraMarginMenus = []; }
      extraMarginMenus.forEach(m => {
        if (!m || !m.name) return;
        const existing = menuList.find(x => x.name.toLowerCase() === String(m.name).toLowerCase());
        if (existing) {
          existing.price = Number(m.price) || 0;
          existing.cat = m.cat || existing.cat || 'Umum';
          existing.isExtraMarginMenu = true;
        } else {
          menuList.push({ name: m.name, cat: m.cat || 'Umum', price: Number(m.price) || 0, isExtraMarginMenu: true });
        }
      });
      const hiddenMenus = getHiddenMarginMenus();
      menuList.forEach(m => {
        if (!hiddenMenus.includes(m.name) && !recipeData.some(r => r.menuName === m.name)) {
          recipeData.push({ id: Date.now() + Math.floor(Math.random() * 1000), menuName: m.name, category: m.cat || 'Umum', ingredients: defaultIngredientsFor(m.name), marginPercent: 40 });
        }
      });
      const searchValue = (document.getElementById('margin-menu-search')?.value || '').trim().toLowerCase();
      const table = document.getElementById('margin-table-body');
      if (!table) return;
      const visibleRecipes = recipeData.filter(r => !hiddenMenus.includes(r.menuName) && r.menuName.toLowerCase().includes(searchValue));
      const cntEl = document.getElementById('margin-menu-count');
      if (cntEl) cntEl.textContent = `${visibleRecipes.length} menu`;
      table.innerHTML = visibleRecipes.map((r, index) => {
        const menuItem = menuList.find(m => m.name === r.menuName);
        const sellingPrice = menuItem ? (Number(menuItem.price) || 0) : 0;
        const margin = Math.min(99, Math.max(0, Number(r.marginPercent ?? 40)));
        const profit = sellingPrice * margin / 100;
        const hpp = calculateMenuHPP(r, sellingPrice);
        return `<tr>
          <td style="font-weight:700; color:var(--primary);"><span style="display:inline-block; min-width:24px; color:var(--text-muted);">${index + 1}.</span>${escapeHTML(r.menuName)}</td>
          <td style="font-weight:700;">${formatRp(sellingPrice)}</td>
          <td>${+margin.toFixed(2)}%</td>
          <td style="font-weight:700; color:var(--success);">${formatRp(profit)}</td>
          <td style="font-weight:700;">${formatRp(hpp)}</td>
          <td style="white-space:nowrap;"><button class="btn btn-outline btn-sm" onclick="editMenuMargin(${r.id})">Edit</button> <button class="btn btn-danger btn-sm" onclick="deleteMarginMenu(${r.id})">Hapus</button></td>
        </tr>`;
      }).join('') || `<tr><td colspan="6" style="text-align:center; color:var(--text-muted);">${searchValue ? 'Menu tidak ditemukan.' : 'Belum ada data menu.'}</td></tr>`;
      saveRecipesToStorage();
    }

    function addMarginMenu() {
      const modal = document.getElementById('margin-add-modal');
      if (!modal) return;
      document.getElementById('margin-add-name').value = '';
      document.getElementById('margin-add-category').value = 'Umum';
      document.getElementById('margin-add-price').value = '';
      document.getElementById('margin-add-percent').value = '40';
      modal.classList.add('active');
      setTimeout(() => document.getElementById('margin-add-name')?.focus(), 50);
    }

    function closeMarginAdd() {
      document.getElementById('margin-add-modal')?.classList.remove('active');
    }

    function saveMarginMenu() {
      const name = document.getElementById('margin-add-name').value.trim();
      const category = document.getElementById('margin-add-category').value.trim() || 'Umum';
      const priceRaw = document.getElementById('margin-add-price').value;
      const marginRaw = document.getElementById('margin-add-percent').value;
      const price = Number(priceRaw);
      const margin = Number(marginRaw);

      if (!name) { alert('Nama menu wajib diisi.'); document.getElementById('margin-add-name').focus(); return; }
      if (recipeData.some(r => String(r.menuName).toLowerCase() === name.toLowerCase())) {
        alert('Menu tersebut sudah ada di Kelola Margin.'); return;
      }
      if (priceRaw === '' || !Number.isFinite(price) || price < 0) {
        alert('Harga jual harus berupa angka 0 atau lebih.'); return;
      }
      if (marginRaw === '' || !Number.isFinite(margin) || margin < 0 || margin > 99) {
        alert('Margin harus diisi antara 0% sampai 99%.'); return;
      }

      let extras = [];
      try { extras = JSON.parse(localStorage.getItem('resto_sim_extra_margin_menus') || '[]'); }
      catch (e) { extras = []; }
      extras = extras.filter(m => !m || !m.name || String(m.name).toLowerCase() !== name.toLowerCase());
      extras.push({ name, cat: category, price });
      localStorage.setItem('resto_sim_extra_margin_menus', JSON.stringify(extras));
      const hiddenMenus = getHiddenMarginMenus().filter(m => String(m).toLowerCase() !== name.toLowerCase());
      localStorage.setItem('resto_sim_hidden_margin_menus', JSON.stringify(hiddenMenus));

      recipeData.push({
        id: Date.now() + Math.floor(Math.random() * 1000),
        menuName: name,
        category,
        ingredients: [],
        marginPercent: margin
      });
      saveRecipesToStorage();
      closeMarginAdd();
      renderRecipeModule();
      alert(`Menu "${name}" berhasil ditambahkan ke Kelola Margin.`);
    }

    function editMenuMargin(id) {
      protectedAction(() => {
        const recipe = recipeData.find(r => String(r.id) === String(id));
        if (!recipe) return;

        const localRaw = localStorage.getItem('resto_pos_sim_app_data');
        let sellingPrice = 0;
        if (localRaw) {
          try {
            const appData = JSON.parse(localRaw);
            const product = (appData.products || []).find(p => p.name === recipe.menuName);
            if (product) sellingPrice = Number(product.price) || 0;
          } catch (e) {}
        }
        if (!sellingPrice) {
          try {
            const extras = JSON.parse(localStorage.getItem('resto_sim_extra_margin_menus') || '[]');
            const extra = extras.find(m => m && m.name && m.name.toLowerCase() === recipe.menuName.toLowerCase());
            if (extra) sellingPrice = Number(extra.price) || 0;
          } catch (e) {}
        }
        if (!sellingPrice && rawData.length) {
          const trx = rawData.find(d => d.Produk === recipe.menuName);
          if (trx) sellingPrice = Number(trx.Harga_Satuan) || 0;
        }

        document.getElementById('margin-edit-id').value = recipe.id;
        document.getElementById('margin-edit-title').textContent = 'Edit Data Menu';
        document.getElementById('margin-edit-name').value = recipe.menuName;
        document.getElementById('margin-edit-price').value = sellingPrice;
        document.getElementById('margin-edit-percent').value = +Number(recipe.marginPercent ?? 40).toFixed(4);
        marginEditFromMargin();
        document.getElementById('margin-edit-modal').classList.add('active');
      });
    }

    // Sinkron dua arah di form edit: ubah margin -> HPP berubah, ubah HPP -> margin berubah
    function marginEditFromMargin() {
      const price = Number(document.getElementById('margin-edit-price').value);
      const m = Number(document.getElementById('margin-edit-percent').value);
      const out = document.getElementById('margin-edit-hpp');
      if (!out || !Number.isFinite(price) || !Number.isFinite(m)) return;
      out.value = Math.max(0, Math.round(price - price * m / 100));
    }
    function marginEditFromHpp() {
      const price = Number(document.getElementById('margin-edit-price').value);
      const hpp = Number(document.getElementById('margin-edit-hpp').value);
      const out = document.getElementById('margin-edit-percent');
      if (!out || !(price > 0) || !Number.isFinite(hpp)) return;
      out.value = +Math.min(99, Math.max(0, (price - hpp) / price * 100)).toFixed(4);
    }

    function closeMarginEdit() {
      const modal = document.getElementById('margin-edit-modal');
      if (modal) modal.classList.remove('active');
    }

    function saveMenuMarginEdit() {
      const id = document.getElementById('margin-edit-id').value;
      const recipe = recipeData.find(r => String(r.id) === String(id));
      if (!recipe) {
        alert('Data menu tidak ditemukan.');
        closeMarginEdit();
        return;
      }

      const priceInput = document.getElementById('margin-edit-price').value;
      const marginInput = document.getElementById('margin-edit-percent').value;
      const price = Number(priceInput);
      const margin = Number(marginInput);

      if (priceInput === '' || !Number.isFinite(price) || price < 0) {
        alert('Harga jual harus berupa angka 0 atau lebih.');
        return;
      }
      if (marginInput === '' || !Number.isFinite(margin) || margin < 0 || margin > 99) {
        alert('Margin harus diisi antara 0% sampai 99%.');
        return;
      }
      recipe.marginPercent = margin;
      delete recipe.manualHpp;

      // Perbarui harga produk POS jika menu terdaftar di kasir.
      let updatedPOSProduct = false;
      const localRaw = localStorage.getItem('resto_pos_sim_app_data');
      if (localRaw) {
        try {
          const appData = JSON.parse(localRaw);
          const product = (appData.products || []).find(p => p.name === recipe.menuName);
          if (product) {
            product.price = price;
            appData.recipes = recipeData;
            localStorage.setItem('resto_pos_sim_app_data', JSON.stringify(appData));
            updatedPOSProduct = true;
          }
        } catch (e) {
          alert('Harga belum berhasil disimpan ke data kasir. Periksa penyimpanan browser.');
          return;
        }
      }

      // Simpan harga tersendiri untuk menu margin yang tidak berasal dari produk POS.
      let extras = [];
      try { extras = JSON.parse(localStorage.getItem('resto_sim_extra_margin_menus') || '[]'); }
      catch (e) { extras = []; }
      extras = extras.filter(m => !m || !m.name || m.name.toLowerCase() !== recipe.menuName.toLowerCase());
      extras.push({ name: recipe.menuName, cat: recipe.category || 'Umum', price });
      localStorage.setItem('resto_sim_extra_margin_menus', JSON.stringify(extras));

      saveRecipesToStorage();
      closeMarginEdit();
      renderRecipeModule();
      if (updatedPOSProduct) {
        alert('Harga jual, margin, untung, dan HPP berhasil diperbarui. Harga produk kasir juga ikut diperbarui.')
      } else {
        alert('Harga jual, margin, untung, dan HPP berhasil diperbarui.')
      }
    }

    document.addEventListener('keydown', function(event) {
      if (event.key === 'Escape') {
        closeMarginAdd();
        closeMarginEdit();
      }
    });

    function deleteMarginMenu(id) {
      protectedAction(() => {
        const recipe = recipeData.find(r => String(r.id) === String(id));
        if (!recipe) return;
        if (!confirm(`Hapus menu "${recipe.menuName}" sepenuhnya dari Kelola Margin? Produk di kasir dan riwayat transaksi tidak ikut dihapus.`)) return;

        const menuName = recipe.menuName;
        const hiddenMenus = getHiddenMarginMenus();
        if (!hiddenMenus.some(name => String(name).toLowerCase() === menuName.toLowerCase())) {
          hiddenMenus.push(menuName);
        }
        localStorage.setItem('resto_sim_hidden_margin_menus', JSON.stringify(hiddenMenus));

        // Hapus seluruh konfigurasi margin/resep dan data menu tambahan yang khusus untuk Kelola Margin.
        recipeData = recipeData.filter(r => r.menuName.toLowerCase() !== menuName.toLowerCase());
        let extras = [];
        try { extras = JSON.parse(localStorage.getItem('resto_sim_extra_margin_menus') || '[]'); }
        catch (e) { extras = []; }
        extras = extras.filter(m => !m || !m.name || m.name.toLowerCase() !== menuName.toLowerCase());
        localStorage.setItem('resto_sim_extra_margin_menus', JSON.stringify(extras));

        saveRecipesToStorage();
        renderRecipeModule();
      });
    }

    function handleRecipeMenuSelect(val) {
      const selectMenu = document.getElementById('resep-menu-name');
      const opt = selectMenu.options[selectMenu.selectedIndex];
      if (opt) {
        document.getElementById('resep-menu-cat').value = opt.getAttribute('data-cat') || '';
      }
    }

    function addRecipeIngredientRow(selectedStockId = "", qtyVal = "") {
      const container = document.getElementById('recipe-ingredients-list');
      const rowId = 'ing-row-' + Date.now() + '-' + Math.random().toString(36).substr(2,4);

      const stockOptionsHtml = stockData.map(s => 
        `<option value="${s.id}" ${s.id == selectedStockId ? 'selected' : ''}>${escapeHTML(s.name)} (${formatRp(s.price)}/${s.unit})</option>`
      ).join('');

      const div = document.createElement('div');
      div.id = rowId;
      div.style.cssText = "display:flex; gap:10px; align-items:center;";
      div.innerHTML = `
        <select class="form-control sel-stock-ing" style="flex:2;" onchange="updateRecipeFormHPP()">
          <option value="">-- Pilih Bahan Baku --</option>
          ${stockOptionsHtml}
        </select>
        <input type="number" step="0.001" class="form-control inp-qty-ing" style="flex:1;" placeholder="Takaran/Porsi" value="${qtyVal}" oninput="updateRecipeFormHPP()">
        <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('${rowId}').remove(); updateRecipeFormHPP();">✕</button>
      `;
      container.appendChild(div);
      updateRecipeFormHPP();
    }

    function getRecipeFormHPP() {
      let total = 0;
      const rows = document.querySelectorAll('#recipe-ingredients-list > div');
      rows.forEach(r => {
        const stockId = r.querySelector('.sel-stock-ing').value;
        const qty = parseFloat(r.querySelector('.inp-qty-ing').value) || 0;
        const stock = stockData.find(s => s.id === parseInt(stockId));
        if (stock) total += qty * stock.price;
      });
      return total;
    }

    function updateRecipeFormHPP() {
      const total = getRecipeFormHPP();
      const marginInput = document.getElementById('resep-margin');
      const margin = Math.min(99, Math.max(0, parseFloat(marginInput?.value) || 0));
      const suggestedPrice = total > 0 ? Math.ceil((total / (1 - margin / 100)) / 500) * 500 : 0;
      document.getElementById('resep-calc-hpp').innerText = formatRp(total);
      const priceOutput = document.getElementById('resep-calc-price');
      if (priceOutput) priceOutput.innerText = formatRp(suggestedPrice);
    }

    function applyRecipePrice(id) {
      const recipe = recipeData.find(r => r.id === id);
      if (!recipe) return;
      const hpp = calculateMenuHPP(recipe);
      const margin = Math.min(99, Math.max(0, Number(recipe.marginPercent ?? 40)));
      if (hpp <= 0) {
        alert('HPP belum tersedia untuk menu ini, jadi harga rekomendasi belum bisa dihitung.');
        return;
      }
      const suggestedPrice = Math.ceil((hpp / (1 - margin / 100)) / 500) * 500;
      const localRaw = localStorage.getItem('resto_pos_sim_app_data');
      if (!localRaw) {
        alert('Data produk kasir tidak ditemukan. Harga rekomendasi tetap dapat dilihat pada daftar resep.');
        return;
      }
      try {
        const appData = JSON.parse(localRaw);
        const product = (appData.products || []).find(p => p.name === recipe.menuName);
        if (!product) {
          alert('Menu ini belum ada di daftar produk kasir.');
          return;
        }
        if (!confirm(`Terapkan harga ${formatRp(suggestedPrice)} untuk ${recipe.menuName} di kasir?`)) return;
        product.price = suggestedPrice;
        appData.recipes = recipeData;
        localStorage.setItem('resto_pos_sim_app_data', JSON.stringify(appData));
        renderRecipeModule();
        alert('Harga jual berhasil diperbarui pada data produk kasir.');
      } catch (err) {
        alert('Harga belum berhasil diperbarui. Periksa kembali data produk kasir.');
      }
    }

    function handleSaveRecipe(e) {
      e.preventDefault();
      const editId = parseInt(document.getElementById('resep-edit-id').value);
      const menuName = document.getElementById('resep-menu-name').value;
      const category = document.getElementById('resep-menu-cat').value;
      const marginPercent = Math.min(99, Math.max(0, parseFloat(document.getElementById('resep-margin').value) || 0));

      const rows = document.querySelectorAll('#recipe-ingredients-list > div');
      const ingredients = [];
      rows.forEach(r => {
        const stockId = r.querySelector('.sel-stock-ing').value;
        const qty = parseFloat(r.querySelector('.inp-qty-ing').value) || 0;
        if (stockId && qty > 0) {
          ingredients.push({ stockId: parseInt(stockId), qty: qty });
        }
      });

      if (!menuName || ingredients.length === 0) {
        alert("Mohon pilih menu dan tambahkan minimal 1 bahan baku!");
        return;
      }

      if (editId > -1) {
        const idx = recipeData.findIndex(r => r.id === editId);
        if (idx !== -1) recipeData[idx] = { ...recipeData[idx], id: editId, menuName, category, ingredients, marginPercent };
      } else {
        // Jika menu sudah dibuat otomatis dari daftar produk POS, perbarui resepnya agar tidak duplikat.
        const existingIdx = recipeData.findIndex(r => r.menuName === menuName);
        if (existingIdx !== -1) {
          recipeData[existingIdx] = { ...recipeData[existingIdx], menuName, category, ingredients, marginPercent };
        } else {
          recipeData.push({ id: Date.now(), menuName, category, ingredients, marginPercent });
        }
      }

      saveRecipesToStorage();
      deductStockOnTransaction();
          saveRawDataToStorage();
      renderRecipeModule();
      cancelRecipeEdit();
      applyFilters();
      alert("Standar Resep berhasil disimpan & HPP diperbarui!");
    }

    function editRecipe(id) {
      protectedAction(() => {
        const r = recipeData.find(x => x.id === id);
        if (!r) return;
        document.getElementById('resep-edit-id').value = r.id;
        document.getElementById('resep-menu-name').value = r.menuName;
        document.getElementById('resep-menu-cat').value = r.category;
        document.getElementById('resep-margin').value = r.marginPercent ?? 40;
        
        document.getElementById('recipe-ingredients-list').innerHTML = '';
        if (r.ingredients) {
          r.ingredients.forEach(ing => addRecipeIngredientRow(ing.stockId, ing.qty));
        }

        document.getElementById('resep-form-title').innerText = `✏️ Edit Standar Resep: ${r.menuName}`;
        document.getElementById('btn-resep-submit').innerText = "💾 Update Resep";
        document.getElementById('btn-resep-cancel').style.display = "inline-flex";
        switchTab('resep');
      });
    }

    function cancelRecipeEdit() {
      document.getElementById('resep-edit-id').value = "-1";
      document.getElementById('form-resep').reset();
      document.getElementById('recipe-ingredients-list').innerHTML = '';
      document.getElementById('resep-form-title').innerText = "📖 Kelola Standar Resep (Standardized Recipe) & Hitung HPP Modal";
      document.getElementById('btn-resep-submit').innerText = "💾 Simpan Standar Resep";
      document.getElementById('btn-resep-cancel').style.display = "none";
      document.getElementById('resep-margin').value = 40;
      document.getElementById('resep-calc-hpp').innerText = "Rp 0";
      document.getElementById('resep-calc-price').innerText = "Rp 0";
    }

    function deleteRecipe(id) {
      protectedAction(() => {
        if (confirm("Hapus Standar Resep ini?")) {
          recipeData = recipeData.filter(x => x.id !== id);
          saveRecipesToStorage();
          renderRecipeModule();
          applyFilters();
        }
      });
    }

    /* PENGELUARAN RESTO -> BELANJA BAHAN BAKU TO STOK INTEGRATION */
    function handleExpCategoryChange(val) {
      const box = document.getElementById('box-select-stock-ing');
      if (val === "Pembelian Bahan Baku") {
        box.style.display = "block";
        const sel = document.getElementById('exp-stock-id');
        sel.innerHTML = '<option value="">-- Pilih Bahan Baku di Stok --</option>' +
          STOCK_CATEGORIES.map(c => {
            const items = stockData.filter(s => s.category === c);
            return items.length ? `<optgroup label="${escapeHTML(c)}">` + items.map(s => `<option value="${s.id}">${escapeHTML(s.name)} (${s.unit})</option>`).join('') + '</optgroup>' : '';
          }).join('');
      } else {
        box.style.display = "none";
      }
    }

    function autoFillExpenseStockDetail() {
      const stockId = parseInt(document.getElementById('exp-stock-id').value);
      const stock = stockData.find(s => s.id === stockId);
      if (stock) {
        document.getElementById('exp-stock-unitprice').value = stock.price;
        document.getElementById('exp-desc').value = `Pembelian Restok ${stock.name}`;
      }
    }

    function calcExpStockTotal() {
      const qty = parseFloat(document.getElementById('exp-stock-qty').value) || 0;
      const price = parseFloat(document.getElementById('exp-stock-unitprice').value) || 0;
      document.getElementById('exp-amount').value = Math.round(qty * price);
    }

    /* SINKRONISASI POS & EXCEL */
    function syncWithHTML1Data() {
      const localRaw = localStorage.getItem('world_taste_pos_app_data') || localStorage.getItem('resto_pos_sim_app_data');
      if (localRaw) {
        try {
          const appData = JSON.parse(localRaw);
          if (Array.isArray(appData.reservations) && appData.reservations.length) mergeReservations(appData.reservations);
          if (appData.recipes) recipeData = appData.recipes;
          if (appData.products && appData.products.length > 0) {
            upsertMenuMasters(appData.products.map(p => ({ name: p.name, cat: p.category, price: p.price })), { unhide: true });
          }
          if (appData.sales && appData.sales.length > 0) {
            const normalized = [];
            appData.sales.forEach(s => {
              if (s.items) {
                s.items.forEach(item => {
                  normalized.push({
                    Tanggal: s.date ? s.date.substring(0, 10) : new Date().toISOString().slice(0,10),
                    ID_Transaksi: s.trxId || 'TRX-000',
                    OrderType: s.orderType || 'Dine In',
                    OrderRef: s.orderRef || '-',
                    Produk: item.productName || 'Menu Resto',
                    Kategori: item.category || 'Makanan Utama',
                    Jumlah: item.qty || 1,
                    Harga_Satuan: item.unitPrice || 0,
                    Diskon: item.discount || 0,
                    Metode_Pembayaran: s.paymentMethod || 'Tunai',
                    Penjualan: item.netSales || 0,
                    processedStock: false
                  });
                });
              }
            });

            rawData = normalized;
            document.getElementById('data-status-badge').innerText = `DATA POS KASIR (${rawData.length} Item Terjual)`;
            
            deductStockOnTransaction();
          saveRawDataToStorage();

            populateFilterOptions();
            applyFilters();
            return;
          }
        } catch (e) {
          console.error("Gagal sinkron data POS:", e);
        }
      }
      
      // Jika belum ada data transaksi sama sekali, biarkan data kosong (tanpa dummy fallback)
      rawData = [];
      document.getElementById('data-status-badge').innerText = `BELUM ADA DATA TRANSAKSI`;
      populateFilterOptions();
      applyFilters();
    }

    /* AUTO-SINKRON: gabungkan transaksi & reservasi dari Kasir (upsert per ID struk, tidak menghapus data Excel) */
    function mergePOSIntoDashboard(fromLiveEvent) {
      try {
        const raw = localStorage.getItem('world_taste_pos_app_data') || localStorage.getItem('resto_pos_sim_app_data');
        if (!raw) return false;
        const pos = JSON.parse(raw);
        let changed = false;
        if (Array.isArray(pos.reservations) && pos.reservations.length) { mergeReservations(pos.reservations); changed = true; }
        if (Array.isArray(pos.sales) && pos.sales.length) {
          const rows = [];
          pos.sales.forEach(s => (s.items || []).forEach(item => rows.push({
            Tanggal: s.date ? String(s.date).substring(0, 10) : new Date().toISOString().slice(0, 10),
            ID_Transaksi: s.trxId || 'TRX-000',
            OrderType: s.orderType || 'Dine In',
            OrderRef: s.orderRef || '-',
            Produk: item.productName || 'Menu Resto',
            Kategori: item.category || 'Makanan Utama',
            Jumlah: item.qty || 1,
            Harga_Satuan: item.unitPrice || 0,
            Diskon: item.discount || 0,
            Metode_Pembayaran: s.paymentMethod || 'Tunai',
            Penjualan: item.netSales || 0,
            processedStock: false
          })));
          if (rows.length) {
            rawData = rows.sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal))); // cermin data Kasir
            document.getElementById('data-status-badge').innerText = `DATA POS KASIR (${rawData.length} Item Terjual)`;
            deductStockOnTransaction();
            saveRawDataToStorage();
            populateFilterOptions();
            applyFilters();
            changed = true;
          }
        }
        if (fromLiveEvent === true && pos && Array.isArray(pos.sales) && !pos.sales.length && rawData.length) {
          rawData = []; // riwayat transaksi di Kasir dikosongkan -> Dashboard ikut
          document.getElementById('data-status-badge').innerText = 'BELUM ADA DATA TRANSAKSI';
          saveRawDataToStorage(); populateFilterOptions(); applyFilters(); changed = true;
        }
        if (changed && typeof renderDashReservations === 'function') renderDashReservations();
        return changed;
      } catch (e) { console.warn('Auto-sinkron POS gagal:', e); return false; }
    }

    /* Merapikan sheet Excel: judul, header berwarna, lebar kolom, format angka, baris TOTAL */
    function tidySheet(ws, rows) {
      try {
        const BROWN = '3B2010', CREAM = 'FFF7ED', LINE = 'D6C4B5';
        const bd = { style: 'thin', color: { rgb: LINE } };
        const border = { top: bd, bottom: bd, left: bd, right: bd };
        const ncol = Math.max.apply(null, rows.map(r => r.length).concat([1]));
        let headerRow = rows.findIndex(r => r.filter(x => x !== '' && x !== undefined).length > 1);
        if (headerRow < 0) headerRow = 0;
        const widths = new Array(ncol).fill(10);
        rows.forEach((r, ri) => r.forEach((v, ci) => {
          if (ri < headerRow) return;
          const len = (typeof v === 'number') ? String(Math.round(v)).length + 4 : String(v === undefined ? '' : v).length + 2;
          widths[ci] = Math.min(60, Math.max(widths[ci], len));
        }));
        ws['!cols'] = widths.map(w => ({ wch: w }));
        for (let ri = 0; ri < rows.length; ri++) {
          for (let ci = 0; ci < ncol; ci++) {
            const addr = XLSX.utils.encode_cell({ r: ri, c: ci });
            const cell = ws[addr];
            if (ri < headerRow) {
              if (cell && ci === 0) cell.s = { font: { bold: true, sz: ri === 0 ? 15 : 11 } };
              continue;
            }
            if (!cell) continue;
            const first = String(rows[ri][0] || '');
            if (ri === headerRow) {
              cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { patternType: 'solid', fgColor: { rgb: BROWN } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: border };
            } else if (rows[ri].length > 0 && rows[ri].some(x => x !== '')) {
              const isTotal = /^TOTAL|BERSIH|LABA/i.test(first);
              const st = { font: { bold: isTotal }, border: border, alignment: { horizontal: typeof cell.v === 'number' ? 'right' : 'left', vertical: 'center' } };
              if (isTotal) st.fill = { patternType: 'solid', fgColor: { rgb: 'FFE8D5' } };
              else if (ri % 2 === 0) st.fill = { patternType: 'solid', fgColor: { rgb: CREAM } };
              cell.s = st;
              if (cell.t === 'n') cell.z = '#,##0';
            }
          }
        }
        ws['!rows'] = []; ws['!rows'][headerRow] = { hpt: 28 };
      } catch (e) { console.warn('tidySheet gagal (file tetap dibuat):', e); }
    }

    function normalizeTanggal(v) {
      if (v instanceof Date && !isNaN(v)) return v.toISOString().slice(0, 10);
      if (typeof v === 'number' && v > 20000) {
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        return d.toISOString().slice(0, 10);
      }
      const t = String(v || '').trim();
      if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.substring(0, 10);
      const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
      if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
      return new Date().toISOString().slice(0, 10);
    }

    // Angka tahan banting: 38000, "38.000", "Rp 38,000", "Rp38.000,50"
    function toNum(v) {
      if (typeof v === 'number') return isNaN(v) ? 0 : v;
      let t = String(v === undefined || v === null ? '' : v).replace(/[^0-9,.\-]/g, '');
      if (!t) return 0;
      if (t.includes(',') && t.includes('.')) {
        t = t.lastIndexOf(',') > t.lastIndexOf('.') ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
      } else if ((t.match(/[.,]/g) || []).length > 1) {
        t = t.replace(/[.,]/g, '');
      } else if (/^-?\d{1,3}[.,]\d{3}$/.test(t)) {
        t = t.replace(/[.,]/g, '');
      } else {
        t = t.replace(',', '.');
      }
      const n = parseFloat(t);
      return isNaN(n) ? 0 : n;
    }

    // Samakan nama kolom: abaikan huruf besar/kecil, spasi ganda, dan tanda baca
    function normKey(k) { return String(k).toLowerCase().replace(/\(rp\)|\(%\)/g, '').replace(/[^a-z0-9]/g, ''); }
    function buildGetter(row) {
      const map = {};
      Object.keys(row).forEach(k => { map[normKey(k)] = row[k]; });
      return (...names) => {
        for (const n of names) {
          const v = map[normKey(n)];
          if (v !== undefined && v !== '') return v;
        }
        return '';
      };
    }

    function pickItemSheet(workbook) {
      const hasMenuCol = n => {
        const rows = XLSX.utils.sheet_to_json(workbook.Sheets[n], { defval: "" });
        if (!rows.length) return false;
        const keys = Object.keys(rows[0]).map(normKey);
        return keys.includes('namamenu') || keys.includes('produk');
      };
      const byName = workbook.SheetNames.find(n => n.toLowerCase().includes('detail item'));
      if (byName && hasMenuCol(byName)) return byName;
      return workbook.SheetNames.find(hasMenuCol) || null;
    }

    // Kunci transaksi yang stoknya sudah dipotong (disimpan permanen, agar upload ulang tidak memotong stok dua kali)
    function trxKey(d) { return `${d.ID_Transaksi}|${d.Produk}|${d.Jumlah}`; }
    function loadProcessedKeys() {
      try { return new Set(JSON.parse(localStorage.getItem('resto_sim_processed_keys') || '[]')); } catch (e) { return new Set(); }
    }
    function saveProcessedKeys(set) {
      try { localStorage.setItem('resto_sim_processed_keys', JSON.stringify(Array.from(set))); } catch (e) {}
    }

    function parseItemRows(sheet, fileLabel) {
      const jsonRaw = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      const rows = []; let skipped = 0;
      jsonRaw.forEach((row, idx) => {
        const g = buildGetter(row);
        const menu = String(g('Nama Menu', 'Produk')).trim();
        if (!menu) { skipped++; return; }
        const qty = toNum(g('Qty Porsi', 'Jumlah', 'Qty'));
        const harga = toNum(g('Harga Satuan (Rp)', 'Harga_Satuan', 'Harga Satuan'));
        const diskon = toNum(g('Diskon Item (Rp)', 'Diskon'));
        let total = toNum(g('Total Jual (Rp)', 'Penjualan', 'Total Jual'));
        if (!total && qty && harga) total = qty * harga - diskon;
        rows.push({
          Tanggal: normalizeTanggal(g('Waktu', 'Tanggal', 'Waktu Transaksi')),
          ID_Transaksi: String(g('ID Struk', 'ID_Transaksi') || `TRX-${fileLabel}-${idx + 1}`),
          OrderType: g('Jenis Order', 'Tipe Order') || 'Dine In',
          OrderRef: g('Meja / Antrean', 'Meja/Antrean') || '-',
          Produk: menu,
          Kategori: g('Kategori') || 'Makanan Utama',
          Jumlah: qty || 1,
          Harga_Satuan: harga,
          Diskon: diskon,
          Metode_Pembayaran: g('Metode Pembayaran') || 'Tunai',
          Penjualan: total,
          processedStock: false
        });
      });
      return { rows, skipped };
    }

    // Sinkronkan daftar menu (nama, kategori, harga jual) dari file POS ke Kelola Margin
    function syncMenusFromWorkbook(workbook, soldRows) {
      let items = [];
      const stokName = workbook.SheetNames.find(n => n.toLowerCase().includes('stok menu'));
      if (stokName) {
        XLSX.utils.sheet_to_json(workbook.Sheets[stokName], { defval: "" }).forEach(row => {
          const g = buildGetter(row);
          const name = String(g('Nama Menu', 'Produk')).trim();
          if (name) items.push({ name, cat: String(g('Kategori') || '').trim(), price: toNum(g('Harga Satuan (Rp)', 'Harga Satuan', 'Harga')) });
        });
      }
      const seen = new Set(items.map(i => normMenuName(i.name)));
      soldRows.forEach(d => {
        const k = normMenuName(d.Produk);
        if (!seen.has(k)) { seen.add(k); items.push({ name: d.Produk, cat: d.Kategori, price: d.Harga_Satuan }); }
      });
      const res = upsertMenuMasters(items, { unhide: true });
      return { total: items.length, added: res.added, priceChanged: res.priceChanged };
    }

    // Upsert per ID transaksi: transaksi baru ditambahkan, transaksi yang sama diperbarui (tanpa dobel hitung)
    function mergeUploadedRows(rows) {
      const ids = new Set(rows.map(r => r.ID_Transaksi));
      const existing = new Set(rawData.map(r => r.ID_Transaksi));
      let baru = 0, diperbarui = 0;
      ids.forEach(id => existing.has(id) ? diperbarui++ : baru++);
      rawData = rawData.filter(r => !ids.has(r.ID_Transaksi)).concat(rows);
      rawData.sort((a, b) => String(b.Tanggal).localeCompare(String(a.Tanggal)));
      return { baru, diperbarui };
    }

    function hppSummaryOf(rows) {
      let sales = 0, hpp = 0, noRecipe = 0;
      rows.forEach(d => {
        const rc = findRecipeForMenu(d.Produk);
        if (!rc) noRecipe++;
        sales += d.Penjualan;
        hpp += (rc ? calculateMenuHPP(rc, d.Harga_Satuan) : 0) * d.Jumlah;
      });
      return { sales, hpp, laba: sales - hpp, fcr: sales > 0 ? (hpp / sales * 100) : 0, noRecipe };
    }

    /* ==========================================================================
       RIWAYAT RESERVASI MEJA (sinkron dari Excel / data POS)
       Aturan: reservasi tidak pernah dihapus oleh sinkronisasi; hanya ditambah / diperbarui per ID.
       ========================================================================== */
    const DASH_RES_KEY = 'resto_sim_reservations';
    function loadDashReservations() { const v = readJSONKey(DASH_RES_KEY, []); return Array.isArray(v) ? v : []; }

    function normResDatetime(v) {
      if (v instanceof Date && !isNaN(v)) { const p = n => String(n).padStart(2, '0'); return `${v.getFullYear()}-${p(v.getMonth() + 1)}-${p(v.getDate())} ${p(v.getHours())}:${p(v.getMinutes())}`; }
      if (typeof v === 'number' && v > 20000) {
        const d = new Date(Math.round((v - 25569) * 86400 * 1000));
        const p = n => String(n).padStart(2, '0');
        return `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
      }
      let t = String(v || '').trim().replace('T', ' ');
      const m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})(?:\s+(\d{1,2})[:.](\d{2}))?/);
      if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')} ${String(m[4] || '00').padStart(2, '0')}:${m[5] || '00'}`;
      return t.substring(0, 16);
    }

    function pickReservationSheet(workbook) {
      return workbook.SheetNames.find(n => n.toLowerCase().includes('reservasi')) || null;
    }

    function parseReservationRows(sheet) {
      const out = [];
      XLSX.utils.sheet_to_json(sheet, { defval: '' }).forEach(row => {
        const g = buildGetter(row);
        const name = String(g('Nama Tamu', 'Nama')).trim();
        const datetime = normResDatetime(g('Waktu Kedatangan', 'Tanggal & Jam', 'Waktu'));
        if (!name && !datetime) return;
        const table = String(g('Meja')).trim();
        const notesRaw = String(g('Catatan')).trim();
        out.push({
          id: String(g('ID Reservasi', 'ID')).trim() || `RES-${normMenuName(datetime + name + table).slice(0, 14)}`,
          datetime, name,
          phone: String(g('Kontak HP', 'Kontak', 'No. HP')).trim(),
          table, pax: toNum(g('Jumlah Pax', 'Pax')) || 1,
          status: String(g('Status')).trim() || 'Pending',
          notes: notesRaw === '-' ? '' : notesRaw
        });
      });
      return out;
    }

    function mergeReservations(incoming) {
      const map = new Map(loadDashReservations().map(r => [r.id, r]));
      let baru = 0, diperbarui = 0;
      (incoming || []).forEach(r => {
        if (!r || !r.id) return;
        const rec = Object.assign({}, r, { datetime: normResDatetime(r.datetime) });
        if (map.has(r.id)) { map.set(r.id, Object.assign({}, map.get(r.id), rec)); diperbarui++; }
        else { map.set(r.id, rec); baru++; }
      });
      const list = Array.from(map.values()).sort((a, b) => String(b.datetime).localeCompare(String(a.datetime)));
      try { localStorage.setItem(DASH_RES_KEY, JSON.stringify(list)); } catch (e) { console.warn('Gagal menyimpan reservasi', e); }
      return { baru, diperbarui, total: list.length };
    }

    function renderDashReservations() {
      const body = document.getElementById('dash-res-body');
      if (!body) return;
      const list = loadDashReservations();
      const today = new Date(); const p = n => String(n).padStart(2, '0');
      const todayStr = `${today.getFullYear()}-${p(today.getMonth() + 1)}-${p(today.getDate())}`;
      const cnt = { Pending: 0, Arrived: 0, Completed: 0, Cancelled: 0 };
      let past = 0;
      list.forEach(r => { if (cnt[r.status] !== undefined) cnt[r.status]++; if (String(r.datetime).substring(0, 10) < todayStr) past++; });
      const kpi = (t, v, c) => `<div style="padding:8px 12px; border-radius:10px; background:rgba(148,163,184,0.10);"><div style="font-size:0.72rem; color:var(--text-muted);">${t}</div><div style="font-size:1.15rem; font-weight:700; color:${c || 'var(--text-main)'};">${v}</div></div>`;
      document.getElementById('dash-res-kpi').innerHTML =
        kpi('Total Reservasi', list.length) + kpi('Menunggu (Pending)', cnt.Pending, 'var(--warning)') + kpi('Tamu Tiba', cnt.Arrived, 'var(--primary)') +
        kpi('Selesai', cnt.Completed, 'var(--success)') + kpi('Batal', cnt.Cancelled, 'var(--danger)') + kpi('Riwayat (tanggal lewat)', past);
      const shown = list.slice(0, 100);
      document.getElementById('dash-res-info').innerText = list.length ? `Menampilkan ${shown.length} dari ${list.length} reservasi` : 'Belum ada data reservasi.';
      const badge = st => {
        const map = { Pending: ['#fef3c7', '#d97706', 'Pending'], Arrived: ['#dbeafe', '#1d4ed8', 'Tiba (Check-In)'], Completed: ['#d1fae5', '#059669', 'Selesai'], Cancelled: ['#fee2e2', '#dc2626', 'Batal'] };
        const m = map[st] || ['#e2e8f0', '#475569', st || '-'];
        return `<span style="font-size:0.75rem; font-weight:bold; background:${m[0]}; color:${m[1]}; padding:2px 8px; border-radius:12px;">${escapeHTML(m[2])}</span>`;
      };
      body.innerHTML = shown.length ? shown.map(r => {
        const isPast = String(r.datetime).substring(0, 10) < todayStr;
        return `<tr>
          <td style="font-weight:600; white-space:nowrap;">${escapeHTML(r.datetime || '-')}${isPast ? ' <span style="font-size:0.68rem; color:var(--text-muted);">(riwayat)</span>' : ''}</td>
          <td style="font-weight:700;">${escapeHTML(r.name)}</td>
          <td>${escapeHTML(r.phone)}</td>
          <td><strong>${escapeHTML(r.table)}</strong> (${escapeHTML(r.pax)} Pax)</td>
          <td>${badge(r.status)}</td>
          <td style="font-size:0.8rem;">${escapeHTML(r.notes || '-')}</td>
        </tr>`;
      }).join('') : '<tr><td colspan="6" style="text-align:center; color:var(--text-muted); padding:16px;">Belum ada data reservasi. Unggah Excel dari POS atau klik "Sinkronkan Data POS".</td></tr>';
    }

    function handleFileUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = new Uint8Array(evt.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = pickItemSheet(workbook);
          const resSheetName = pickReservationSheet(workbook);

          // 0) Reservasi: riwayat tidak pernah dihapus, hanya ditambah / diperbarui per ID
          let resSync = null;
          if (resSheetName) {
            try { resSync = mergeReservations(parseReservationRows(workbook.Sheets[resSheetName])); } catch (er) { console.warn('Sheet reservasi gagal dibaca', er); }
          }
          const resLine = resSync ? ('• Reservasi meja: baru ' + resSync.baru + ' | diperbarui ' + resSync.diperbarui + ' | total riwayat ' + resSync.total + '\n') : '';

          let parsedAll = { rows: [], skipped: 0 };
          if (sheetName) parsedAll = parseItemRows(workbook.Sheets[sheetName], file.name.replace(/\W+/g, ''));
          const parsed = parsedAll.rows;

          if (!sheetName || parsed.length === 0) {
            if (resSync) {
              renderDashReservations();
              applyFilters();
              switchTab('tps');
              alert('✅ Sinkronisasi reservasi berhasil\n' + resLine + '\nFile ini belum berisi transaksi penjualan, jadi laporan penjualan tidak berubah.\nKlik "💾 Simpan Perubahan" agar tersimpan di file HTML.');
              return;
            }
            if (!sheetName) {
              alert('File ini tidak berisi data item terjual.\n\nGunakan file Excel hasil tombol "Unduh Laporan Excel" di POS (harus ada sheet "Detail Item Terjual" dengan kolom Nama Menu, Qty Porsi, Total Jual).\nSheet yang ditemukan: ' + workbook.SheetNames.join(', '));
            } else {
              alert('Sheet "' + sheetName + '" kosong atau tidak punya baris menu yang valid.');
            }
            return;
          }

          // 1) Sinkron menu & harga jual ke Kelola Margin (menu baru otomatis dibuatkan HPP standar + resep bahan bila dikenal)
          const menuSync = syncMenusFromWorkbook(workbook, parsed);
          // 2) Gabungkan transaksi (upsert per ID struk)
          const merged = mergeUploadedRows(parsed);
          document.getElementById('data-status-badge').innerText = `FILE: ${file.name} (${rawData.length} item)` + (parsedAll.skipped ? ` • ${parsedAll.skipped} baris kosong dilewati` : '');

          // 3) Potong stok bahan baku sesuai resep (transaksi yang sama tidak dipotong dua kali)
          const stokSebelum = stockData.reduce((a, x) => a + x.qty, 0);
          deductStockOnTransaction();
          const stokBerubah = stokSebelum - stockData.reduce((a, x) => a + x.qty, 0) > 0;
          saveRawDataToStorage();
          populateFilterOptions();
          // 4) Hitung ulang seluruh laporan (HPP, laba kotor, food cost) otomatis
          applyFilters();
          const sum = hppSummaryOf(parsed);
          const hiddenM = getHiddenMarginMenus();
          const tanpaResep = recipeData.filter(r => !hiddenM.includes(r.menuName) && !(r.ingredients && r.ingredients.length)).length;
          switchTab('mis');
          alert(
            '✅ Unggah & sinkronisasi berhasil\n' +
            '• Transaksi baru: ' + merged.baru + ' | diperbarui: ' + merged.diperbarui + '\n' +
            '• Item terjual dari file: ' + parsed.length + '\n' +
            '• Menu tersinkron: ' + menuSync.total + ' (baru ' + menuSync.added + ', harga berubah ' + menuSync.priceChanged + ')\n' +
            resLine +
            '• Stok bahan baku: ' + (stokBerubah ? 'terpotong otomatis sesuai resep' : 'tidak ada perubahan (transaksi sudah pernah diproses)') + '\n\n' +
            'Laporan HPP dari file ini:\n' +
            '• Penjualan: ' + formatRp(sum.sales) + '\n' +
            '• Total HPP: ' + formatRp(sum.hpp) + ' (Food Cost ' + sum.fcr.toFixed(1) + '%)\n' +
            '• Laba Kotor: ' + formatRp(sum.laba) +
            (sum.noRecipe ? '\n\n⚠ ' + sum.noRecipe + ' baris tanpa data margin/HPP.' : '') +
            (tanpaResep ? '\n⚠ ' + tanpaResep + ' menu belum punya resep bahan (stok bahannya tidak terpotong).' : '') +
            '\n\nKlik "💾 Simpan Perubahan" agar hasil ini tersimpan di file HTML.'
          );
        } catch (err) {
          console.error(err);
          alert('Gagal memproses file Excel/CSV!\nDetail: ' + (err && err.message ? err.message : err));
        } finally {
          e.target.value = '';
        }
      };
      reader.readAsArrayBuffer(file);
    }

    function populateFilterOptions() {
      const periods = [...new Set(rawData.map(d => d.Tanggal.substring(0, 7)))].sort();
      const categories = [...new Set(rawData.map(d => d.Kategori))].sort();

      document.getElementById('filter-period').innerHTML = '<option value="ALL">Semua Periode</option>' + periods.map(p => `<option value="${p}">${p}</option>`).join('');
      document.getElementById('filter-category').innerHTML = '<option value="ALL">Semua Kategori</option>' + categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    function applyFilters() {
      const period = document.getElementById('filter-period').value;
      const category = document.getElementById('filter-category').value;

      filteredData = rawData.filter(d => {
        const matchP = (period === "ALL" || d.Tanggal.startsWith(period));
        const matchC = (category === "ALL" || d.Kategori === category);
        return matchP && matchC;
      });

      // Setiap bagian dirender terpisah: bila satu gagal (mis. library grafik tidak termuat saat offline), bagian lain tetap tampil
      [renderESS, renderMIS, renderTPS, renderDashReservations, renderExpenses, renderStock, renderRecipeModule, runDSS, renderInsight]
        .forEach(fn => { try { fn(); } catch (err) { console.warn('Render gagal:', fn.name, err); } });
    }

    function switchTab(tabId) {
      if (tabId === 'stock') tabId = 'ess'; // fitur Pengelola Resto sudah dihapus
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      const targetPane = document.getElementById(`tab-${tabId}`);
      if (targetPane) targetPane.classList.add('active');

      const activeBtn = Array.from(document.querySelectorAll('.nav-tab')).find(b => b.getAttribute('onclick').includes(tabId));
      if (activeBtn) activeBtn.classList.add('active');
    }

    /* Analisis best seller per kategori untuk ESS. Mengutamakan transaksi POS tersimpan;
       jika data POS belum tersedia pada origin file ini, gunakan dataset dashboard aktif. */
    function renderESSBestSellerAnalysis() {
      const period = document.getElementById('filter-period')?.value || 'ALL';
      const selectedCategory = document.getElementById('filter-category')?.value || 'ALL';
      let rows = [];
      let sourceLabel = 'Data Dashboard';
      try {
        const posData = JSON.parse(localStorage.getItem('world_taste_pos_app_data') || 'null');
        if (posData && Array.isArray(posData.sales)) {
          sourceLabel = 'Data Transaksi POS';
          posData.sales.forEach(sale => {
            const day = String(sale.date || '').substring(0, 10);
            if (period !== 'ALL' && !day.startsWith(period)) return;
            (sale.items || []).forEach(item => {
              const category = String(item.category || 'Tanpa Kategori');
              if (selectedCategory !== 'ALL' && category !== selectedCategory) return;
              const qty = Math.max(0, Number(item.qty) || 0);
              if (!qty) return;
              rows.push({ category, name: String(item.productName || item.name || 'Menu Tanpa Nama'), qty, revenue: Number(item.netSales) || ((Number(item.unitPrice) || 0) * qty) });
            });
          });
        }
      } catch (err) { console.warn('Data POS belum dapat dibaca untuk analisis ESS:', err); }

      if (sourceLabel !== 'Data Transaksi POS') {
        rows = filteredData.filter(d => selectedCategory === 'ALL' || d.Kategori === selectedCategory).map(d => ({
          category: String(d.Kategori || 'Tanpa Kategori'), name: String(d.Produk || 'Menu Tanpa Nama'),
          qty: Math.max(0, Number(d.Jumlah) || 0), revenue: Number(d.Penjualan) || 0
        })).filter(r => r.qty > 0);
      }

      const categoryTotals = new Map();
      const perCategory = new Map();
      rows.forEach(r => {
        categoryTotals.set(r.category, (categoryTotals.get(r.category) || 0) + r.qty);
        const menus = perCategory.get(r.category) || new Map();
        const current = menus.get(r.name) || { name: r.name, qty: 0, revenue: 0 };
        current.qty += r.qty; current.revenue += r.revenue; menus.set(r.name, current); perCategory.set(r.category, menus);
      });
      const ranked = [...perCategory.entries()].map(([category, menus]) => {
        const top = [...menus.values()].sort((a,b) => b.qty-a.qty || b.revenue-a.revenue)[0];
        return { category, ...top, categoryQty: categoryTotals.get(category) || 0 };
      }).sort((a,b) => b.categoryQty-a.categoryQty || a.category.localeCompare(b.category));
      const best = ranked[0];
      const sourceEl = document.getElementById('ess-best-seller-source');
      if (sourceEl) sourceEl.textContent = sourceLabel + (sourceLabel === 'Data Dashboard' ? ' · POS belum terbaca' : ' · mengikuti filter periode/kategori');
      const bestName = document.getElementById('ess-best-category-name');
      const bestUnits = document.getElementById('ess-best-category-units');
      const countEl = document.getElementById('ess-best-category-count');
      if (bestName) bestName.textContent = best ? best.category : '-';
      if (bestUnits) bestUnits.textContent = best ? `${best.categoryQty.toLocaleString('id-ID')} unit terjual` : '0 unit terjual';
      if (countEl) countEl.textContent = ranked.length.toLocaleString('id-ID');
      const tbody = document.getElementById('ess-best-category-table');
      if (tbody) tbody.innerHTML = ranked.length ? ranked.map(r => `<tr><td><strong>${escapeHTML(r.category)}</strong></td><td>⭐ <strong>${escapeHTML(r.name)}</strong></td><td><strong>${r.qty.toLocaleString('id-ID')}</strong></td><td>${formatRp(r.revenue)}</td></tr>`).join('') : '<tr><td colspan="4" style="text-align:center;color:var(--text-muted);padding:14px;">Belum ada data penjualan pada filter ini.</td></tr>' ;
    }

    /* ESS EKSEKUTIF LOGIC DENGAN HPP & LABA KOTOR */
    function renderESS() {
      const totalSales = filteredData.reduce((a, b) => a + b.Penjualan, 0);
      let totalHPP = 0;

      filteredData.forEach(d => {
        const recipe = findRecipeForMenu(d.Produk);
        const hppPerUnit = recipe ? calculateMenuHPP(recipe, d.Harga_Satuan) : 0;
        totalHPP += (hppPerUnit * d.Jumlah);
      });

      const grossProfit = totalSales - totalHPP;
      const foodCostRatio = totalSales > 0 ? ((totalHPP / totalSales) * 100).toFixed(1) : 0;
      const transactionIds = new Set(filteredData.map(d => d.ID_Transaksi || `${d.Tanggal}-${d.Produk}`));
      const totalTransactions = transactionIds.size;
      const totalUnits = filteredData.reduce((sum, d) => sum + (Number(d.Jumlah) || 0), 0);
      const bestSellerMap = {};
      filteredData.forEach(d => {
        bestSellerMap[d.Produk] = (bestSellerMap[d.Produk] || 0) + (Number(d.Jumlah) || 0);
      });
      const bestSeller = Object.entries(bestSellerMap).sort((a, b) => b[1] - a[1])[0];

      document.getElementById('ess-kpi-sales').innerText = formatShortRp(totalSales);
      document.getElementById('ess-kpi-transactions').innerText = totalTransactions.toLocaleString('id-ID');
      document.getElementById('ess-kpi-units').innerText = totalUnits.toLocaleString('id-ID');
      document.getElementById('ess-kpi-best-seller').innerText = bestSeller ? `👑 ${bestSeller[0]} (${bestSeller[1]} unit)` : '-';
      renderESSBestSellerAnalysis();
      document.getElementById('ess-kpi-hpp').innerText = formatShortRp(totalHPP);
      document.getElementById('ess-kpi-gross-profit').innerText = formatShortRp(grossProfit);
      document.getElementById('ess-kpi-foodcost-ratio').innerText = `${foodCostRatio}%`;

      const monthMap = {};
      filteredData.forEach(d => {
        const m = d.Tanggal.substring(0, 10);
        monthMap[m] = (monthMap[m] || 0) + d.Penjualan;
      });

      const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--primary').trim() || '#2563eb';
      // Urutkan tanggal dari yang terkecil (kiri) ke terbesar (kanan)
      const trendKeys = Object.keys(monthMap).sort();

      const ctxTrend = document.getElementById('chart-trend').getContext('2d');
      if (chartTrendInstance) chartTrendInstance.destroy();
      chartTrendInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
          labels: trendKeys,
          datasets: [{
            label: 'Omset Penjualan Net (Rp)',
            data: trendKeys.map(k => monthMap[k]),
            borderColor: primaryColor,
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      const catMap = {};
      filteredData.forEach(d => { catMap[d.Kategori] = (catMap[d.Kategori] || 0) + d.Penjualan; });

      const ctxCat = document.getElementById('chart-category').getContext('2d');
      if (chartCatInstance) chartCatInstance.destroy();
      chartCatInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
          labels: Object.keys(catMap),
          datasets: [{
            data: Object.values(catMap),
            backgroundColor: ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });

      document.getElementById('ess-insight-box').innerHTML = filteredData.length > 0 ? `
        Total Net Sales mencapai <strong>${formatRp(totalSales)}</strong> dengan Total HPP Modal Bahan <strong>${formatRp(totalHPP)}</strong>.
        Hal ini menghasilkan <strong>Laba Kotor (Gross Profit)</strong> sebesar <strong>${formatRp(grossProfit)}</strong>
        serta <strong>Food Cost Ratio</strong> sebesar <strong>${foodCostRatio}%</strong> (Standar Ideal Resto: 28% - 35%).<br>
        Tercatat <strong>${totalTransactions}</strong> transaksi dengan total <strong>${totalUnits}</strong> unit terjual.
        👑 Best Seller adalah <strong>${bestSeller ? escapeHTML(bestSeller[0]) + ` (${bestSeller[1]} unit)` : '-'}</strong>.
      ` : `Belum ada data transaksi dari POS yang disinkronkan. Silakan tambahkan transaksi di POS Kasir (HTML 2).`;
    }

    /* MIS LAPORAN LOGIC DENGAN BREAKDOWN HPP PER MENU */
    function renderMIS() {
      const totalSales = filteredData.reduce((a, b) => a + b.Penjualan, 0);
      let totalHPP = 0;

      const prodMap = {};
      filteredData.forEach(d => {
        if (!prodMap[d.Produk]) prodMap[d.Produk] = { cat: d.Kategori, units: 0, sales: 0, price: d.Harga_Satuan };
        prodMap[d.Produk].units += d.Jumlah;
        prodMap[d.Produk].sales += d.Penjualan;

        const recipe = findRecipeForMenu(d.Produk);
        const hppPerUnit = recipe ? calculateMenuHPP(recipe, d.Harga_Satuan) : 0;
        totalHPP += (hppPerUnit * d.Jumlah);
      });

      const grossProfit = totalSales - totalHPP;
      const fcr = totalSales > 0 ? ((totalHPP / totalSales) * 100).toFixed(1) : 0;
      const trxTotals = new Map();
      const paymentByTransaction = new Map();
      let totalDiscount = 0;
      let totalUnits = 0;
      filteredData.forEach((d, index) => {
        const trxId = d.ID_Transaksi || `${d.Tanggal}-${index}`;
        trxTotals.set(trxId, (trxTotals.get(trxId) || 0) + (Number(d.Penjualan) || 0));
        if (!paymentByTransaction.has(trxId)) paymentByTransaction.set(trxId, d.Metode_Pembayaran || 'Tunai');
        totalDiscount += Number(d.Diskon) || 0;
        totalUnits += Number(d.Jumlah) || 0;
      });
      const avgTransaction = trxTotals.size ? totalSales / trxTotals.size : 0;
      const avgUnitPrice = totalUnits ? totalSales / totalUnits : 0;
      const paymentCounts = {};
      paymentByTransaction.forEach(method => {
        paymentCounts[method] = (paymentCounts[method] || 0) + 1;
      });
      const mainPayment = Object.entries(paymentCounts).sort((a, b) => b[1] - a[1])[0];

      document.getElementById('mis-kpi-avgtransaction').innerText = formatShortRp(avgTransaction);
      document.getElementById('mis-kpi-avgprice').innerText = formatShortRp(avgUnitPrice);
      document.getElementById('mis-kpi-mainpayment').innerText = mainPayment ? mainPayment[0] : '-';
      document.getElementById('mis-kpi-discount').innerText = formatShortRp(totalDiscount);

      const prodKeys = Object.keys(prodMap);
      document.getElementById('mis-table-product').innerHTML = prodKeys.length > 0 ? prodKeys.map(p => {
        const item = prodMap[p];
        const recipe = findRecipeForMenu(p);
        const hppUnit = recipe ? calculateMenuHPP(recipe, item.price) : 0;
        const totalHppItem = hppUnit * item.units;
        const labaKotorItem = item.sales - totalHppItem;
        const foodCostPct = item.sales > 0 ? ((totalHppItem / item.sales) * 100).toFixed(1) : 0;

        return `
          <tr>
            <td style="font-weight:600;">${escapeHTML(p)}</td>
            <td>${escapeHTML(item.cat)}</td>
            <td>${item.units} porsi</td>
            <td>${formatRp(item.price)}</td>
            <td style="color:var(--danger);">${formatRp(hppUnit)}</td>
            <td style="font-weight:600;">${formatRp(item.sales)}</td>
            <td style="color:var(--danger); font-weight:600;">${formatRp(totalHppItem)}</td>
            <td style="color:var(--success); font-weight:700;">${formatRp(labaKotorItem)}</td>
            <td><span class="badge-alert ${foodCostPct > 35 ? 'badge-alert-danger' : 'badge-alert-success'}">${foodCostPct}%</span></td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:16px;">Belum ada data penjualan menu.</td></tr>';

      const periodMap = {};
      filteredData.forEach(d => {
        const m = d.Tanggal;
        if (!periodMap[m]) periodMap[m] = { trx: 0, units: 0, sales: 0 };
        periodMap[m].trx += 1;
        periodMap[m].units += d.Jumlah;
        periodMap[m].sales += d.Penjualan;
      });

      const periodKeys = Object.keys(periodMap).sort();
      document.getElementById('mis-table-period').innerHTML = periodKeys.length > 0 ? periodKeys.map(m => {
        const item = periodMap[m];
        return `
          <tr>
            <td style="font-weight:600;">${m}</td>
            <td>${item.trx} Transaksi</td>
            <td>${item.units} Porsi</td>
            <td style="font-weight:700; color:var(--primary);">${formatRp(item.sales)}</td>
          </tr>
        `;
      }).join('') : '<tr><td colspan="4" style="text-align:center; color:var(--text-muted); padding:16px;">Belum ada data periode.</td></tr>';
    }

    /* TPS TRANSAKSI LOGIC */
    function renderTPS() {
      const displayData = filteredData.slice(0, 150);
      document.getElementById('tps-row-info').innerText = `Menampilkan ${displayData.length} dari ${filteredData.length} baris data`;

      document.getElementById('tps-table-body').innerHTML = displayData.length > 0 ? displayData.map(d => `
        <tr>
          <td>${d.Tanggal}</td>
          <td style="font-weight:600; font-family:monospace;">${escapeHTML(d.ID_Transaksi)}</td>
          <td><span style="font-size:0.75rem; font-weight:bold; background:#e0f2fe; color:#0369a1; padding:2px 8px; border-radius:12px;">${d.OrderType || 'Dine In'} (${escapeHTML(d.OrderRef || '-')})</span></td>
          <td style="font-weight:600;">${escapeHTML(d.Produk)}</td>
          <td>${escapeHTML(d.Kategori)}</td>
          <td>${d.Jumlah}</td>
          <td>${formatRp(d.Harga_Satuan)}</td>
          <td style="color:var(--danger);">${d.Diskon > 0 ? '-' + formatRp(d.Diskon) : 'Rp 0'}</td>
          <td>${escapeHTML(d.Metode_Pembayaran)}</td>
          <td style="font-weight:700;">${formatRp(d.Penjualan)}</td>
        </tr>
      `).join('') : '<tr><td colspan="10" style="text-align:center; color:var(--text-muted); padding:16px;">Belum ada transaksi kasir yang dicatat.</td></tr>';
    }

    /* PENGELUARAN RESTO LOGIC */
    function saveExpensesToStorage() {
      localStorage.setItem('resto_sim_expenses', JSON.stringify(expenseData));
    }

    function loadExpensesFromStorage() {
      const saved = localStorage.getItem('resto_sim_expenses');
      if (saved) {
        try { expenseData = JSON.parse(saved); } catch (e){}
      }
    }

    function handleAddExpense(e) {
      e.preventDefault();
      const date = document.getElementById('exp-date').value;
      const category = document.getElementById('exp-category').value;
      const desc = document.getElementById('exp-desc').value.trim();
      const amount = parseFloat(document.getElementById('exp-amount').value) || 0;

      if (!date || !desc || amount <= 0) {
        alert("Mohon isi semua field pengeluaran dengan benar!");
        return;
      }

      if (category === "Pembelian Bahan Baku") {
        const stockId = parseInt(document.getElementById('exp-stock-id').value);
        const qty = parseFloat(document.getElementById('exp-stock-qty').value) || 0;
        const stock = stockData.find(s => s.id === stockId);

        if (stock && qty > 0) {
          stock.qty = Math.round((stock.qty + qty) * 1000) / 1000;
          saveStockToStorage();
          renderStock();
        }
      }

      const newExp = {
        id: Date.now(),
        date: date,
        category: category,
        desc: desc,
        amount: amount
      };

      expenseData.unshift(newExp);
      saveExpensesToStorage();
      renderExpenses();
      renderESS();
      document.getElementById('form-expense').reset();
      document.getElementById('exp-date').value = new Date().toISOString().slice(0, 10);
      document.getElementById('box-select-stock-ing').style.display = "none";
      alert("Pengeluaran resto berhasil dicatat!");
    }

    function deleteExpense(id) {
      protectedAction(() => {
        if (confirm("Apakah Anda yakin ingin menghapus catatan pengeluaran ini?")) {
          expenseData = expenseData.filter(x => x.id !== id);
          saveExpensesToStorage();
          renderExpenses();
          renderESS();
        }
      });
    }

    function resetExpensesToDefault() {
      if (confirm("Kembalikan data pengeluaran ke contoh awal?")) {
        localStorage.removeItem('resto_sim_expenses');
        expenseData = [];
        renderExpenses();
        renderESS();
      }
    }

    function renderExpenses() {
      const totalExp = expenseData.reduce((a, b) => a + b.amount, 0);
      
      const matExp = expenseData
        .filter(x => x.category.includes('Bahan Baku') || x.category.includes('Bumbu'))
        .reduce((a, b) => a + b.amount, 0);

      const opsExp = totalExp - matExp;

      const catMap = {};
      expenseData.forEach(x => { catMap[x.category] = (catMap[x.category] || 0) + x.amount; });

      let topCat = "-"; let maxVal = 0;
      for (let c in catMap) { if (catMap[c] > maxVal) { maxVal = catMap[c]; topCat = c; } }

      document.getElementById('exp-kpi-total').innerText = formatShortRp(totalExp);
      document.getElementById('exp-kpi-materials').innerText = formatShortRp(matExp);
      document.getElementById('exp-kpi-operational').innerText = formatShortRp(opsExp);
      document.getElementById('exp-kpi-top-cat').innerText = topCat !== "-" ? `${topCat}` : "-";

      document.getElementById('expense-table-body').innerHTML = expenseData.length > 0 ? expenseData.map(x => `
        <tr>
          <td>${x.date}</td>
          <td><span style="font-size:0.75rem; font-weight:bold; background:#fff7ed; color:#c2410c; padding:2px 8px; border-radius:12px; border:1px solid #ffedd5;">${escapeHTML(x.category)}</span></td>
          <td style="font-weight:600;">${escapeHTML(x.desc)}</td>
          <td style="font-weight:700; color:var(--danger);">${formatRp(x.amount)}</td>
          <td><button class="btn btn-danger btn-sm" onclick="deleteExpense(${x.id})">🗑️ Hapus</button></td>
        </tr>
      `).join('') : '<tr><td colspan="5" style="text-align:center; color:var(--text-muted); padding:16px;">Belum ada catatan pengeluaran.</td></tr>';

      const ctxExp = document.getElementById('chart-expenses').getContext('2d');
      if (chartExpInstance) chartExpInstance.destroy();
      chartExpInstance = new Chart(ctxExp, {
        type: 'pie',
        data: {
          labels: Object.keys(catMap),
          datasets: [{
            data: Object.values(catMap),
            backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#6366f1']
          }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    /* STOK BAHAN BAKU LOGIC */
    function saveStockToStorage() {
      localStorage.setItem('resto_sim_stock', JSON.stringify(stockData));
      saveRecipesToStorage();
    }

    function loadStockFromStorage() {
      const saved = localStorage.getItem('resto_sim_stock');
      if (saved) {
        try { stockData = JSON.parse(saved); } catch (e){}
      }
    }

    function handleSaveStockItem(e) {
      e.preventDefault();
      const editId = parseInt(document.getElementById('stock-edit-id').value);
      const name = document.getElementById('stock-name').value.trim();
      const category = document.getElementById('stock-category').value;
      const qty = parseFloat(document.getElementById('stock-qty').value) || 0;
      const unit = document.getElementById('stock-unit').value.trim();
      const minStock = parseFloat(document.getElementById('stock-min').value) || 0;
      const price = parseFloat(document.getElementById('stock-price').value) || 0;

      if (!name || !unit) return;

      if (editId > -1) {
        const idx = stockData.findIndex(s => s.id === editId);
        if (idx !== -1) stockData[idx] = { id: editId, name, category, qty, unit, minStock, price };
      } else {
        const newId = Date.now();
        stockData.push({ id: newId, name, category, qty, unit, minStock, price });
      }

      saveStockToStorage();
      renderStock();
      cancelStockEdit();
      alert("Data persediaan bahan baku berhasil disimpan!");
    }

    function editStockItem(id) {
      protectedAction(() => {
        const item = stockData.find(s => s.id === id);
        if (!item) return;

        document.getElementById('stock-edit-id').value = item.id;
        document.getElementById('stock-name').value = item.name;
        document.getElementById('stock-category').value = item.category;
        document.getElementById('stock-qty').value = item.qty;
        document.getElementById('stock-unit').value = item.unit;
        document.getElementById('stock-min').value = item.minStock;
        document.getElementById('stock-price').value = item.price;

        document.getElementById('stock-form-title').innerText = `✏️ Edit Persediaan Bahan Baku: ${item.name}`;
        document.getElementById('btn-stock-submit').innerText = "💾 Update Bahan Baku";
        document.getElementById('btn-stock-cancel').style.display = "inline-flex";
        switchTab('stock');
      });
    }

    function cancelStockEdit() {
      document.getElementById('stock-edit-id').value = "-1";
      document.getElementById('form-stock').reset();
      document.getElementById('stock-form-title').innerText = "➕ Kelola Stok & Inventaris Bahan Baku Resto";
      document.getElementById('btn-stock-submit').innerText = "➕ Simpan / Tambah Bahan Baku";
      document.getElementById('btn-stock-cancel').style.display = "none";
    }

    function deleteStockItem(id) {
      protectedAction(() => {
        if (confirm("Hapus item bahan baku ini dari persediaan?")) {
          stockData = stockData.filter(s => s.id !== id);
          saveStockToStorage();
          renderStock();
        }
      });
    }

    function addQuickStock(id, amount) {
      protectedAction(() => {
        const item = stockData.find(s => s.id === id);
        if (item) {
          item.qty = Math.max(0, parseFloat((item.qty + amount).toFixed(3)));
          saveStockToStorage();
          renderStock();
        }
      });
    }

    function resetStockToDefault() {
      if (confirm("Kembalikan daftar bahan baku sesuai 66 menu POS beserta stok awalnya?\n\nSemua penjualan yang sudah tercatat akan dihitung ulang memotong stok bahan. Bahan yang Anda tambahkan manual akan ikut diganti.")) {
        rebuildStockFromMenus();
        renderStock();
      }
    }

    // Peta bahan -> daftar menu yang memakainya (hanya menu yang tampil di Kelola Margin)
    function buildStockUsageMap() {
      const hidden = getHiddenMarginMenus();
      const map = {};
      recipeData.forEach(r => {
        if (hidden.includes(r.menuName)) return;
        (r.ingredients || []).forEach(i => {
          const id = parseInt(i.stockId);
          (map[id] = map[id] || new Set()).add(r.menuName);
        });
      });
      return map;
    }

    function setStockCategoryFilter(cat) {
      const el = document.getElementById('stock-filter-cat');
      if (el) { el.value = cat; renderStock(); }
    }

    function renderStock() {
      const hidden = getHiddenMarginMenus();
      const catSel = document.getElementById('stock-filter-cat');
      if (catSel && catSel.options.length !== STOCK_CATEGORIES.length + 1) {
        catSel.innerHTML = '<option value="ALL">Semua Kategori</option>' + STOCK_CATEGORIES.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
      }
      const fCat = catSel ? catSel.value : 'ALL';
      const fQ = (document.getElementById('stock-filter-q')?.value || '').trim().toLowerCase();
      const fLow = !!document.getElementById('stock-filter-low')?.checked;

      const totalTypes = stockData.length;
      let alertCount = 0;
      let totalStockVal = 0;
      const catStat = {};
      STOCK_CATEGORIES.forEach(c => { catStat[c] = { n: 0, low: 0, val: 0 }; });

      stockData.forEach(s => {
        totalStockVal += (s.qty * s.price);
        const low = s.qty <= s.minStock;
        if (low) alertCount++;
        const cs = catStat[s.category] || (catStat[s.category] = { n: 0, low: 0, val: 0 });
        cs.n++; cs.val += s.qty * s.price; if (low) cs.low++;
      });

      document.getElementById('stock-kpi-total').innerText = `${totalTypes} Jenis`;
      document.getElementById('stock-kpi-alert').innerText = `${alertCount} Item`;
      document.getElementById('stock-kpi-value').innerText = formatShortRp(totalStockVal);
      document.getElementById('stock-kpi-status').innerText = alertCount === 0 ? "Aman" : (alertCount > 2 ? "Perlu Pembelian Segera" : "Peringatan Waspada");
      document.getElementById('stock-kpi-status').style.color = alertCount === 0 ? "var(--success)" : "var(--danger)";

      // Ringkasan per kategori (klik untuk memfilter)
      const sumEl = document.getElementById('stock-cat-summary');
      if (sumEl) {
        sumEl.innerHTML = Object.keys(catStat).map(c => {
          const st = catStat[c];
          const active = fCat === c;
          return `<div onclick="setStockCategoryFilter('${escapeHTML(c).replace(/'/g, '&#039;')}')" style="cursor:pointer; padding:10px 12px; border-radius:10px; border:1px solid ${active ? 'var(--primary)' : 'var(--border-color, #e2e8f0)'}; background:${active ? 'rgba(37,99,235,0.08)' : 'rgba(148,163,184,0.08)'};">
            <div style="font-size:0.78rem; font-weight:700;">${escapeHTML(c)}</div>
            <div style="font-size:0.95rem; font-weight:700; color:var(--primary);">${st.n} bahan</div>
            <div style="font-size:0.72rem; color:${st.low ? 'var(--danger)' : 'var(--text-muted)'};">${st.low ? '⚠️ ' + st.low + ' menipis' : '✓ semua cukup'} • ${formatShortRp(st.val)}</div>
          </div>`;
        }).join('');
      }

      // Menu yang belum punya resep bahan (stok tidak terpotong saat terjual)
      const noRecipe = recipeData.filter(r => !hidden.includes(r.menuName) && !(r.ingredients && r.ingredients.length)).map(r => r.menuName);
      const nrEl = document.getElementById('stock-norecipe-info');
      if (nrEl) {
        nrEl.innerHTML = noRecipe.length
          ? `⚠️ ${noRecipe.length} menu belum punya resep bahan sehingga stok bahannya tidak terpotong saat terjual: <em>${escapeHTML(noRecipe.slice(0, 6).join(', '))}${noRecipe.length > 6 ? ', dst.' : ''}</em>`
          : `✓ Semua menu sudah terhubung ke bahan baku — stok otomatis terpotong tiap penjualan. (Kemasan take away hanya terpotong untuk pesanan Take Away.)`;
      }

      const usage = buildStockUsageMap();
      const catOrder = {}; STOCK_CATEGORIES.forEach((c, i) => catOrder[c] = i);
      const rows = stockData.map((s, i) => ({ s, i })).filter(({ s }) => {
        if (fCat !== 'ALL' && s.category !== fCat) return false;
        if (fLow && !(s.qty <= s.minStock)) return false;
        if (fQ) {
          const menus = Array.from(usage[s.id] || []).join(' ');
          if (!(String(s.name).toLowerCase().includes(fQ) || menus.toLowerCase().includes(fQ))) return false;
        }
        return true;
      }).sort((a, b) => ((catOrder[a.s.category] ?? 99) - (catOrder[b.s.category] ?? 99)) || (a.i - b.i));

      document.getElementById('stock-table-body').innerHTML = rows.length > 0 ? rows.map(({ s }) => {
        const isAlert = s.qty <= s.minStock;
        const totalVal = s.qty * s.price;
        const qtyTxt = +Number(s.qty).toFixed(3);
        const badge = isAlert
          ? `<span class="badge-alert badge-alert-danger">⚠️ Stok Menipis (${qtyTxt} ${escapeHTML(s.unit)})</span>`
          : `<span class="badge-alert badge-alert-success">✓ Cukup</span>`;
        const menus = Array.from(usage[s.id] || []);
        const menuTxt = menus.length
          ? `<span title="${escapeHTML(menus.join(', '))}" style="font-size:0.78rem;"><strong>${menus.length} menu</strong><br><span style="color:var(--text-muted);">${escapeHTML(menus.slice(0, 3).join(', '))}${menus.length > 3 ? ', +' + (menus.length - 3) + ' lainnya' : ''}</span></span>`
          : '<span style="font-size:0.78rem; color:var(--text-muted);">Belum dipakai menu</span>';

        return `
          <tr style="${isAlert ? 'background: rgba(239, 68, 68, 0.05);' : ''}">
            <td style="font-weight:700;">${escapeHTML(s.name)}</td>
            <td>${escapeHTML(s.category)}</td>
            <td style="font-size:0.95rem; font-weight:700;">${qtyTxt} ${escapeHTML(s.unit)}</td>
            <td>${s.minStock} ${escapeHTML(s.unit)}</td>
            <td>${formatRp(s.price)}</td>
            <td style="font-weight:600; color:var(--primary);">${formatRp(totalVal)}</td>
            <td>${menuTxt}</td>
            <td>${badge}</td>
            <td>
              <div style="display:flex; gap:4px; flex-wrap:wrap;">
                <button class="btn btn-success btn-sm" title="Tambah 5 Stok" onclick="addQuickStock(${s.id}, 5)">+5</button>
                <button class="btn btn-warning btn-sm" title="Edit" onclick="editStockItem(${s.id})">✏️</button>
                <button class="btn btn-danger btn-sm" title="Hapus" onclick="deleteStockItem(${s.id})">🗑️</button>
              </div>
            </td>
          </tr>
        `;
      }).join('') : `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:16px;">${stockData.length ? 'Tidak ada bahan baku yang cocok dengan filter.' : 'Belum ada bahan baku terdaftar.'}</td></tr>`;
    }

    /* DSS SIMULASI LOGIC */
    function runDSS() {
      const demandPct = parseFloat(document.getElementById('sim-demand').value) / 100;
      const pricePct = parseFloat(document.getElementById('sim-price').value) / 100;
      const discPct = parseFloat(document.getElementById('sim-disc').value) / 100;

      document.getElementById('lbl-sim-demand').innerText = (demandPct >= 0 ? '+' : '') + Math.round(demandPct * 100) + '%';
      document.getElementById('lbl-sim-price').innerText = (pricePct >= 0 ? '+' : '') + Math.round(pricePct * 100) + '%';
      document.getElementById('lbl-sim-disc').innerText = Math.round(discPct * 100) + '%';

      const baseSales = filteredData.reduce((a, b) => a + b.Penjualan, 0);
      const simSales = baseSales * (1 + demandPct) * (1 + pricePct) * (1 - discPct);
      const diffSales = simSales - baseSales;
      const pctChange = baseSales > 0 ? ((diffSales / baseSales) * 100).toFixed(1) : 0;

      document.getElementById('dss-base-sales').innerText = formatShortRp(baseSales);
      document.getElementById('dss-sim-sales').innerText = formatShortRp(simSales);
      document.getElementById('dss-diff-sales').innerText = (diffSales >= 0 ? '+' : '') + formatShortRp(diffSales);
      document.getElementById('dss-pct-sales').innerText = (pctChange >= 0 ? '+' : '') + pctChange + '%';

      const sugBox = document.getElementById('dss-suggestion');
      if (diffSales > 0) sugBox.innerText = `Omset diproyeksikan naik ${formatShortRp(diffSales)} (+${pctChange}%). Simulasi skenario aman untuk dieksekusi.`;
      else if (diffSales < 0) sugBox.innerText = `Omset diproyeksikan turun ${formatShortRp(Math.abs(diffSales))} (${pctChange}%). Evaluasi kembali penyesuaian harga & diskon.`;
      else sugBox.innerText = `Omset konstan, tidak ada perubahan omset berarti dari data baseline.`;
    }

    /* INSIGHT LOGIC */
    function renderInsight() {
      const totalSales = filteredData.reduce((a, b) => a + (Number(b.Penjualan) || 0), 0);
      let totalHPP = 0;
      filteredData.forEach(d => {
        const recipe = findRecipeForMenu(d.Produk);
        const hppUnit = recipe ? calculateMenuHPP(recipe, d.Harga_Satuan) : 0;
        totalHPP += hppUnit * (Number(d.Jumlah) || 0);
      });
      const grossProfit = totalSales - totalHPP;
      const fcrValue = totalSales > 0 ? (totalHPP / totalSales) * 100 : 0;
      const fcr = fcrValue.toFixed(1);
      const grossMargin = totalSales > 0 ? ((grossProfit / totalSales) * 100).toFixed(1) : '0.0';
      const lowStockCount = stockData.filter(s => Number(s.qty) <= Number(s.minStock)).length;
      const transactionCount = filteredData.length;
      const healthy = fcrValue <= 35;
      const statusColor = healthy ? '#047857' : '#b45309';
      const statusBg = healthy ? '#ecfdf5' : '#fffbeb';
      const recommendation = healthy
        ? 'Food Cost berada pada batas acuan. Pertahankan standar resep dan pantau biaya bahan secara berkala.'
        : 'Food Cost melebihi acuan 35%. Tinjau porsi, harga beli bahan, waste, dan harga jual menu dengan kontribusi biaya tertinggi.';
      const stockText = lowStockCount === 0
        ? 'Tidak ada bahan baku yang berada pada atau di bawah batas minimum stok.'
        : `${lowStockCount} bahan baku berada pada atau di bawah batas minimum. Prioritaskan pemeriksaan dan pengadaan.`;
      document.getElementById('insight-rules-container').innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px;margin:16px 0;">
          <div class="stat-card" style="border-top:3px solid #2563eb;"><div class="stat-title">Total Penjualan Bersih</div><div class="stat-value" style="color:#1d4ed8;">${formatRp(totalSales)}</div><div style="font-size:.78rem;color:var(--text-muted);margin-top:5px;">Pendapatan dari transaksi terpilih</div></div>
          <div class="stat-card" style="border-top:3px solid #d97706;"><div class="stat-title">Total HPP</div><div class="stat-value" style="color:#b45309;">${formatRp(totalHPP)}</div><div style="font-size:.78rem;color:var(--text-muted);margin-top:5px;">Estimasi biaya bahan menu terjual</div></div>
          <div class="stat-card" style="border-top:3px solid #059669;"><div class="stat-title">Laba Kotor</div><div class="stat-value" style="color:#047857;">${formatRp(grossProfit)}</div><div style="font-size:.78rem;color:var(--text-muted);margin-top:5px;">Penjualan bersih dikurangi HPP</div></div>
          <div class="stat-card" style="border-top:3px solid #7c3aed;"><div class="stat-title">Gross Profit Margin</div><div class="stat-value" style="color:#6d28d9;">${grossMargin}%</div><div style="font-size:.78rem;color:var(--text-muted);margin-top:5px;">Laba kotor terhadap penjualan</div></div>
        </div>
        <div class="card" style="margin-bottom:14px;">
          <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px;">
            <div><div class="card-title" style="margin:0;">📌 Evaluasi Food Cost Ratio</div><div style="font-size:.82rem;color:var(--text-muted);margin-top:4px;">Acuan evaluasi internal: maksimal 35%</div></div>
            <span style="padding:7px 12px;border-radius:20px;background:${statusBg};color:${statusColor};font-weight:800;font-size:.8rem;">${healthy ? 'Terkendali' : 'Perlu Evaluasi'}</span>
          </div>
          <div style="display:flex;align-items:baseline;gap:8px;"><strong style="font-size:2rem;color:${statusColor};">${fcr}%</strong><span style="font-size:.85rem;color:var(--text-muted);">Food Cost Ratio</span></div>
          <div style="height:10px;background:var(--border-color,#e5e7eb);border-radius:20px;overflow:hidden;margin:10px 0 12px;"><div style="height:100%;width:${Math.min(100,Math.max(0,fcrValue))}%;background:${healthy ? '#10b981' : '#f59e0b'};border-radius:20px;"></div></div>
          <div style="font-size:.9rem;line-height:1.65;">${recommendation}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin-bottom:14px;">
          <div class="card" style="margin:0;"><div class="card-title">📦 Kesehatan Persediaan</div><div style="font-size:1.8rem;font-weight:800;margin:6px 0;color:${lowStockCount ? '#b45309' : '#047857'};">${lowStockCount} <span style="font-size:.9rem;font-weight:600;">bahan perlu perhatian</span></div><div style="font-size:.88rem;line-height:1.6;color:var(--text-muted);">${stockText}</div></div>
          <div class="card" style="margin:0;"><div class="card-title">🧾 Cakupan Data</div><div style="font-size:1.8rem;font-weight:800;margin:6px 0;">${transactionCount} <span style="font-size:.9rem;font-weight:600;">baris transaksi</span></div><div style="font-size:.88rem;line-height:1.6;color:var(--text-muted);">Insight mengikuti filter periode dan kategori yang sedang aktif.</div></div>
        </div>
        <div class="card" style="background:var(--surface-secondary,rgba(37,99,235,.06));">
          <div class="card-title">🎯 Prioritas Tindak Lanjut</div>
          <ol style="padding-left:20px;line-height:1.8;font-size:.9rem;margin-bottom:0;">
            <li>Jaga konsistensi resep dan takaran agar biaya bahan tetap terkendali.</li>
            <li>Evaluasi harga beli, porsi, dan harga jual apabila Food Cost melewati acuan.</li>
            <li>Periksa bahan yang menyentuh batas minimum stok dan rencanakan pengadaan.</li>
          </ol>
        </div>`;
    }

    /* STRUKTUR ORGANISASI - stabil, validasi, dan kompres foto */
    function saveOrgMembersToStorage() {
      try {
        localStorage.setItem('resto_sim_org_members', JSON.stringify(orgMembers));
        return true;
      } catch (err) {
        console.error('Gagal menyimpan struktur organisasi:', err);
        alert('Data belum dapat disimpan karena penyimpanan browser penuh. Gunakan foto yang lebih kecil atau hapus data situs yang tidak diperlukan, lalu coba lagi.');
        return false;
      }
    }

    function loadOrgMembersFromStorage() {
      try {
        const saved = localStorage.getItem('resto_sim_org_members');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) {
            orgMembers = parsed.filter(m => m && typeof m === 'object').map((m, i) => ({
              id: Number(m.id) || (Date.now() + i),
              name: String(m.name || ''),
              role: String(m.role || ''),
              level: ['Pimpinan', 'Manajer', 'Anggota'].includes(m.level) ? m.level : 'Anggota',
              photo: typeof m.photo === 'string' ? m.photo : ''
            }));
          }
        }
      } catch (err) {
        console.warn('Data struktur organisasi tidak dapat dibaca:', err);
      }
      const orgName = localStorage.getItem('resto_sim_org_name');
      const orgNameInput = document.getElementById('org-group-name');
      if (orgNameInput && orgName) orgNameInput.value = orgName;
      const orgTitle = document.getElementById('org-display-name');
      if (orgTitle && orgName) orgTitle.textContent = orgName;
    }

    function saveOrgName() {
      const input = document.getElementById('org-group-name');
      const name = input ? input.value.trim() : '';
      if (!name) {
        alert('Nama organisasi tidak boleh kosong.');
        return;
      }
      try {
        localStorage.setItem('resto_sim_org_name', name);
        const title = document.getElementById('org-display-name');
        if (title) title.textContent = name;
        alert('Nama organisasi berhasil disimpan.');
      } catch (err) {
        alert('Nama organisasi gagal disimpan. Penyimpanan browser mungkin penuh.');
      }
    }

    function renderOrg() {
      const safeMembers = Array.isArray(orgMembers) ? orgMembers : [];
      ['Pimpinan', 'Manajer', 'Anggota'].forEach(lvl => {
        const container = document.getElementById(`org-container-${lvl.toLowerCase()}`);
        if (!container) return;
        const members = safeMembers.filter(m => m && m.level === lvl);
        if (!members.length) {
          container.innerHTML = '<div style="font-size:.85rem;color:var(--text-muted);font-style:italic;">Belum ada anggota pada level ini.</div>';
          return;
        }
        container.innerHTML = members.map(m => {
          const photo = typeof m.photo === 'string' && /^(data:image\/|assets\/img\/)/.test(m.photo) ? m.photo : '';
          const avatar = photo
            ? `<img src="${photo}" class="org-avatar" alt="${escapeHTML(m.name)}" loading="lazy" style="object-fit:cover;">`
            : `<div class="org-avatar">${escapeHTML((m.name || '?').charAt(0).toUpperCase())}</div>`;
          return `<div class="org-card">
            ${avatar}
            <div style="font-weight:700;font-size:.95rem;margin-top:4px;">${escapeHTML(m.name)}</div>
            <div style="font-size:.8rem;color:var(--text-muted);margin-top:2px;">${escapeHTML(m.role)}</div>
            <div class="org-actions">
              <button type="button" class="btn btn-warning btn-sm" onclick="editOrgMember(${Number(m.id)})">✏️ Edit</button>
              <button type="button" class="btn btn-danger btn-sm" onclick="deleteOrgMember(${Number(m.id)})">🗑️ Hapus</button>
            </div>
          </div>`;
        }).join('');
      });
    }

    function compressOrgPhoto(file) {
      return new Promise((resolve, reject) => {
        if (!file) return resolve('');
        if (!file.type || !file.type.startsWith('image/')) return reject(new Error('File harus berupa gambar.'));
        if (file.size > 10 * 1024 * 1024) return reject(new Error('Ukuran foto maksimal 10 MB.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Foto gagal dibaca. Coba pilih foto lain.'));
        reader.onload = () => {
          const img = new Image();
          img.onerror = () => reject(new Error('Format foto tidak dapat dibuka.'));
          img.onload = () => {
            const max = 480;
            const scale = Math.min(1, max / Math.max(img.width, img.height));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(img.width * scale));
            canvas.height = Math.max(1, Math.round(img.height * scale));
            const ctx = canvas.getContext('2d');
            if (!ctx) return reject(new Error('Browser tidak mendukung pemrosesan foto.'));
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            try { resolve(canvas.toDataURL('image/jpeg', 0.72)); }
            catch (err) { reject(new Error('Foto gagal diproses.')); }
          };
          img.src = reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    async function handleSaveOrg(e) {
      e.preventDefault();
      const editId = Number(document.getElementById('org-edit-index').value);
      const name = document.getElementById('org-name').value.trim();
      const role = document.getElementById('org-role').value.trim();
      const level = document.getElementById('org-level').value;
      const photoInput = document.getElementById('org-photo-input');
      const submit = document.getElementById('btn-org-submit');
      if (!name || !role) {
        alert('Silakan isi nama lengkap dan jabatan terlebih dahulu.');
        return;
      }
      if (submit) { submit.disabled = true; submit.textContent = 'Menyimpan...'; }
      try {
        const photoData = photoInput.files && photoInput.files[0]
          ? await compressOrgPhoto(photoInput.files[0]) : '';
        const previous = editId > 0 ? orgMembers.find(m => Number(m.id) === editId) : null;
        const next = Array.isArray(orgMembers) ? [...orgMembers] : [];
        if (editId > 0) {
          if (!previous) throw new Error('Data anggota yang akan diedit tidak ditemukan.');
          const idx = next.findIndex(m => Number(m.id) === editId);
          next[idx] = { ...previous, name, role, level, photo: photoData || previous.photo || '' };
        } else {
          next.push({ id: Date.now(), name, role, level, photo: photoData || '' });
        }
        const old = orgMembers;
        orgMembers = next;
        if (!saveOrgMembersToStorage()) { orgMembers = old; return; }
        renderOrg();
        cancelOrgEdit();
        alert(editId > 0 ? 'Data anggota berhasil diperbarui.' : 'Anggota berhasil ditambahkan.');
      } catch (err) {
        console.error(err);
        alert(err.message || 'Data anggota gagal disimpan.');
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = Number(document.getElementById('org-edit-index').value) > 0 ? '💾 Update Anggota' : '➕ Simpan / Tambah Anggota'; }
      }
    }

    function editOrgMember(id) {
      protectedAction(() => {
      const member = orgMembers.find(m => Number(m.id) === Number(id));
      if (!member) return alert('Data anggota tidak ditemukan.');
      document.getElementById('org-edit-index').value = member.id;
      document.getElementById('org-name').value = member.name || '';
      document.getElementById('org-role').value = member.role || '';
      document.getElementById('org-level').value = member.level || 'Anggota';
      document.getElementById('org-photo-input').value = '';
      document.getElementById('org-form-title').innerText = `✏️ Edit Data Anggota: ${member.name}`;
      document.getElementById('btn-org-submit').innerText = '💾 Update Anggota';
      document.getElementById('btn-org-cancel').style.display = 'inline-flex';
      switchTab('org');
      document.getElementById('form-org').scrollIntoView({ behavior: 'smooth', block: 'center' });
    
      });
    }

    function cancelOrgEdit() {
      const form = document.getElementById('form-org');
      if (form) form.reset();
      document.getElementById('org-edit-index').value = '-1';
      document.getElementById('org-form-title').innerText = '➕ Kelola Tim & Anggota Struktur Organisasi SIM Resto';
      document.getElementById('btn-org-submit').innerText = '➕ Simpan / Tambah Anggota';
      document.getElementById('btn-org-submit').disabled = false;
      document.getElementById('btn-org-cancel').style.display = 'none';
    }

    function deleteOrgMember(id) {
      protectedAction(() => {
      const member = orgMembers.find(m => Number(m.id) === Number(id));
      if (!member) return;
      if (!confirm(`Apakah Anda yakin ingin menghapus ${member.name}?`)) return;
      const old = orgMembers;
      orgMembers = orgMembers.filter(m => Number(m.id) !== Number(id));
      if (!saveOrgMembersToStorage()) orgMembers = old;
      renderOrg();
    
      });
    }

    /* PENGATURAN TAMPILAN & TEMA */
    function saveSettingsIdentitas() {
      const storeName = document.getElementById('cfg-store-name').value.trim();
      const groupName = document.getElementById('cfg-group-name').value.trim();
      const pinVal = document.getElementById('cfg-admin-pin').value.trim();

      if (pinVal) {
        adminPin = pinVal;
        localStorage.setItem('resto_sim_admin_pin', adminPin);
      }
      [['owner','cfg-login-owner'],['manager','cfg-login-manager'],['employee','cfg-login-employee']].forEach(([role,id]) => {
        const value = document.getElementById(id)?.value.trim();
        if (value) localStorage.setItem('resto_sim_login_'+role, value);
        const input = document.getElementById(id);
        if (input) input.value = '';
      });

      document.getElementById('disp-store-name').innerText = storeName || 'World Taste – International Restaurant';
      document.getElementById('disp-group-name').innerText = groupName || 'Group 3 5C Manajerial Accounting';

      localStorage.setItem('resto_sim_store_name', storeName);
      localStorage.setItem('resto_sim_group_name', groupName);
      alert("Identitas Restoran & Pengaturan Keamanan berhasil disimpan!");
    }

    function saveAllVisualSettings() {
      const theme = document.getElementById('cfg-theme').value;
      const overlay = document.getElementById('cfg-overlay-slider').value;
      const cardOp = document.getElementById('cfg-card-opacity-slider').value;

      localStorage.setItem('resto_sim_theme', theme);
      localStorage.setItem('resto_sim_overlay_val', overlay);
      localStorage.setItem('resto_sim_card_opacity', cardOp);

      saveSettingsIdentitas();
      alert("Seluruh Pengaturan Tema & Visual SIM berhasil disimpan!");
    }

    function exportAllSettingsJSON() {
      const configBundle = {
        storeName: localStorage.getItem('resto_sim_store_name') || 'World Taste – International Restaurant',
        groupName: localStorage.getItem('resto_sim_group_name') || 'Group 3 5C Manajerial Accounting',
        adminPin: adminPin,
        theme: localStorage.getItem('resto_sim_theme') || 'sunset',
        overlayVal: localStorage.getItem('resto_sim_overlay_val') || '40',
        cardOpacity: localStorage.getItem('resto_sim_card_opacity') || '94',
        expenses: expenseData,
        stock: stockData,
        recipes: recipeData,
        orgMembers: orgMembers,
        featureAccess: (window.simAccess ? window.simAccess.exportConfig() : undefined)
      };

      const jsonStr = JSON.stringify(configBundle, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `Pengaturan_SIM_Resto_${new Date().toISOString().slice(0,10)}.json`;
      link.click();
    }

    function importAllSettingsJSON(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const cfg = JSON.parse(evt.target.result);
          if (cfg.storeName) {
            localStorage.setItem('resto_sim_store_name', cfg.storeName);
            document.getElementById('cfg-store-name').value = cfg.storeName;
            document.getElementById('disp-store-name').innerText = cfg.storeName;
          }
          if (cfg.groupName) {
            localStorage.setItem('resto_sim_group_name', cfg.groupName);
            document.getElementById('cfg-group-name').value = cfg.groupName;
            document.getElementById('disp-group-name').innerText = cfg.groupName;
          }
          if (cfg.recipes) {
            recipeData = cfg.recipes;
            saveRecipesToStorage();
          }
          if (cfg.stock) {
            stockData = cfg.stock;
            saveStockToStorage();
          }
          if (cfg.featureAccess && window.simAccess) window.simAccess.importConfig(cfg.featureAccess);
          applyFilters();
          alert("Pengaturan SIM berhasil diimpor!");
        } catch(err) {
          alert("File JSON pengaturan tidak valid!");
        }
      };
      reader.readAsText(file);
    }

    function applyTheme(themeName) {
      document.body.setAttribute('data-theme', themeName);
      localStorage.setItem('resto_sim_theme', themeName);
      if (chartTrendInstance) renderESS();
    }

    function uploadLogoFile(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        document.getElementById('header-logo').src = dataUrl;
        localStorage.setItem('resto_sim_logo', dataUrl);
      };
      reader.readAsDataURL(file);
    }

    function uploadHeaderBg(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        document.getElementById('app-header').style.backgroundImage = `url('${dataUrl}')`;
        localStorage.setItem('resto_sim_header_bg', dataUrl);
      };
      reader.readAsDataURL(file);
    }

    function uploadAppBg(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        const dataUrl = evt.target.result;
        document.body.style.backgroundImage = `url('${dataUrl}')`;
        localStorage.setItem('resto_sim_app_bg', dataUrl);
      };
      reader.readAsDataURL(file);
    }

    function updateHeaderOverlay(val) {
      document.getElementById('lbl-overlay-val').innerText = `${val}%`;
      document.documentElement.style.setProperty('--header-overlay-opacity', parseFloat(val) / 100);
      localStorage.setItem('resto_sim_overlay_val', val);
    }

    function updateCardOpacity(val) {
      document.getElementById('lbl-card-opacity-val').innerText = `${val}%`;
      document.documentElement.style.setProperty('--card-opacity', parseFloat(val) / 100);
      localStorage.setItem('resto_sim_card_opacity', val);
    }

    const POS_DEFAULTS = {
      logo: document.getElementById('header-logo').getAttribute('src'),
      header: document.getElementById('app-header').style.backgroundImage,
      body: document.body.style.backgroundImage
    };

    function loadCustomizationTheme() {
      // Migrasi: background lama diganti background World Taste (sekali per browser). Upload background baru setelahnya tetap tersimpan.
      try {
        if (localStorage.getItem('wt_bg_theme') !== 'worldtaste-v1') {
          localStorage.removeItem('resto_sim_app_bg');
          localStorage.removeItem('resto_sim_header_bg');
          localStorage.setItem('wt_bg_theme', 'worldtaste-v1');
        }
      } catch (e) {}
      const savedStoreName = localStorage.getItem('resto_sim_store_name');
      if (savedStoreName) {
        document.getElementById('disp-store-name').innerText = savedStoreName;
        document.getElementById('cfg-store-name').value = savedStoreName;
      }

      let savedGroupName = localStorage.getItem('resto_sim_group_name');
      if (savedGroupName && /Kelompok 1 D4/i.test(savedGroupName)) {
        savedGroupName = 'Group 3 5C Manajerial Accounting';
        localStorage.setItem('resto_sim_group_name', savedGroupName);
      }
      if (savedGroupName) {
        document.getElementById('disp-group-name').innerText = savedGroupName;
        document.getElementById('cfg-group-name').value = savedGroupName;
      }

      const savedAdminPin = localStorage.getItem('resto_sim_admin_pin');
      if (savedAdminPin && savedAdminPin !== '1234') {
        adminPin = savedAdminPin;
      } else {
        adminPin = '1234';
        localStorage.setItem('resto_sim_admin_pin', adminPin);
      }
      document.getElementById('cfg-admin-pin').value = adminPin;

      const savedTheme = localStorage.getItem('resto_sim_theme') || 'light';
      document.body.setAttribute('data-theme', savedTheme);
      document.getElementById('cfg-theme').value = savedTheme;

      const savedLogo = localStorage.getItem('resto_sim_logo');
      if (savedLogo) document.getElementById('header-logo').src = savedLogo;

      const savedHeaderBg = localStorage.getItem('resto_sim_header_bg');
      if (savedHeaderBg) document.getElementById('app-header').style.backgroundImage = `url('${savedHeaderBg}')`;

      const savedAppBg = localStorage.getItem('resto_sim_app_bg');
      if (savedAppBg) document.body.style.backgroundImage = `url('${savedAppBg}')`;

      const savedOverlay = localStorage.getItem('resto_sim_overlay_val') || '40';
      document.getElementById('cfg-overlay-slider').value = savedOverlay;
      updateHeaderOverlay(savedOverlay);

      const savedCardOp = localStorage.getItem('resto_sim_card_opacity') || '94';
      document.getElementById('cfg-card-opacity-slider').value = savedCardOp;
      updateCardOpacity(savedCardOp);
    }

    function resetCustomizationTheme() {
      if (confirm("Reset semua pengaturan visual dan gambar ke bawaan?")) {
        localStorage.removeItem('resto_sim_logo');
        localStorage.removeItem('resto_sim_header_bg');
        localStorage.removeItem('resto_sim_app_bg');
        localStorage.removeItem('resto_sim_overlay_val');
        localStorage.removeItem('resto_sim_card_opacity');
        localStorage.removeItem('resto_sim_theme');
        localStorage.removeItem('resto_sim_store_name');
        localStorage.removeItem('resto_sim_group_name');

        document.getElementById('header-logo').src = POS_DEFAULTS.logo;
        document.getElementById('app-header').style.backgroundImage = POS_DEFAULTS.header;
        document.body.style.backgroundImage = POS_DEFAULTS.body;
        
        document.getElementById('disp-store-name').innerText = "World Taste – International Restaurant";
        document.getElementById('cfg-store-name').value = "World Taste – International Restaurant";
        document.getElementById('disp-group-name').innerText = "Group 3 5C Manajerial Accounting";
        document.getElementById('cfg-group-name').value = "Group 3 5C Manajerial Accounting";

        applyTheme('sunset');
        updateHeaderOverlay(40);
        updateCardOpacity(94);
      }
    }

    function downloadCSV() {
      // HPP dihitung dari harga jual dan margin sesuai rumus yang ditetapkan.
      let csv = "\uFEFFTanggal,ID_Transaksi,OrderType,OrderRef,Produk,Kategori,Jumlah,Harga_Satuan,HPP_Satuan,Total_HPP,Diskon,Metode_Pembayaran,Penjualan\n";
      filteredData.forEach(d => {
        const recipe = findRecipeForMenu(d.Produk);
        const hppUnit = recipe ? calculateMenuHPP(recipe, d.Harga_Satuan) : 0;
        const totalHpp = hppUnit * (Number(d.Jumlah) || 0);
        const safe = value => String(value ?? '').replace(/"/g, '""');
        csv += `"${safe(d.Tanggal)}","${safe(d.ID_Transaksi)}","${safe(d.OrderType)}","${safe(d.OrderRef)}","${safe(d.Produk)}","${safe(d.Kategori)}",${Number(d.Jumlah) || 0},${Number(d.Harga_Satuan) || 0},${hppUnit},${totalHpp},${Number(d.Diskon) || 0},"${safe(d.Metode_Pembayaran)}",${Number(d.Penjualan) || 0}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `Laporan_SIM_Sales_HPP_${new Date().toISOString().slice(0,10)}.csv`;
      link.click();
    }

    /* FITUR EKSPOR LAPORAN HPP, FOOD COST, LABA RUGI, & ARUS KAS (PDF / EXCEL / CSV) */
    function openFinancialExportModal() {
      document.getElementById('export-fin-modal').classList.add('active');
    }

    function closeFinancialExportModal() {
      document.getElementById('export-fin-modal').classList.remove('active');
    }

    function generateFinancialReport() {
      const reportType = document.getElementById('export-report-type').value;
      const format = document.getElementById('export-report-format').value;
      const storeName = document.getElementById('disp-store-name').innerText;
      const periodName = document.getElementById('filter-period').value;

      const totalSales = filteredData.reduce((a, b) => a + b.Penjualan, 0);
      let totalHPP = 0;

      const prodSummary = {};
      filteredData.forEach(d => {
        if (!prodSummary[d.Produk]) prodSummary[d.Produk] = { cat: d.Kategori, qty: 0, sales: 0, price: d.Harga_Satuan };
        prodSummary[d.Produk].qty += d.Jumlah;
        prodSummary[d.Produk].sales += d.Penjualan;

        const recipe = findRecipeForMenu(d.Produk);
        const hppPerUnit = recipe ? calculateMenuHPP(recipe, d.Harga_Satuan) : 0;
        totalHPP += (hppPerUnit * d.Jumlah);
      });

      const grossProfit = totalSales - totalHPP;
      const fcr = totalSales > 0 ? ((totalHPP / totalSales) * 100).toFixed(1) : 0;

      if (reportType === 'hpp_laba') {
        if (format === 'excel') {
          const rows = [
            ["LAPORAN HPP, FOOD COST & LABA KOTOR"],
            [storeName],
            [`Periode: ${periodName}`],
            [""],
            ["Nama Menu Resto", "Kategori", "Terjual (Porsi)", "Harga Jual", "HPP Satuan", "Total Sales Net", "Total HPP Modal", "Laba Kotor", "Food Cost %"]
          ];

          for (let p in prodSummary) {
            const item = prodSummary[p];
            const recipe = findRecipeForMenu(p);
            const hppUnit = recipe ? calculateMenuHPP(recipe, item.price) : 0;
            const hppTot = hppUnit * item.qty;
            const laba = item.sales - hppTot;
            const pct = item.sales > 0 ? ((hppTot / item.sales) * 100).toFixed(1) : 0;
            rows.push([p, item.cat, item.qty, item.price, hppUnit, item.sales, hppTot, laba, `${pct}%`]);
          }

          rows.push([]);
          rows.push(["TOTAL RESTORAN", "", "", "", "", totalSales, totalHPP, grossProfit, `${fcr}%`]);

          const ws = XLSX.utils.aoa_to_sheet(rows);
          tidySheet(ws, rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "HPP & Laba Kotor");
          XLSX.writeFile(wb, `Laporan_HPP_LabaKotor_${periodName}.xlsx`);
        } else if (format === 'csv') {
          let csv = `\uFEFFRumus HPP: Harga Jual - (Harga Jual x Margin %)\nNama Menu,Kategori,Terjual,Harga Jual,HPP Satuan,Total Sales,Total HPP,Laba Kotor,Food Cost %\n`;
          for (let p in prodSummary) {
            const item = prodSummary[p];
            const recipe = findRecipeForMenu(p);
            const hppUnit = recipe ? calculateMenuHPP(recipe, item.price) : 0;
            const hppTot = hppUnit * item.qty;
            const laba = item.sales - hppTot;
            const pct = item.sales > 0 ? ((hppTot / item.sales) * 100).toFixed(1) : 0;
            csv += `"${p}","${item.cat}",${item.qty},${item.price},${hppUnit},${item.sales},${hppTot},${laba},"${pct}%"\n`;
          }
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `Laporan_HPP_LabaKotor_${periodName}.csv`;
          link.click();
        } else {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF('landscape');

          doc.setFontSize(16);
          doc.text(storeName.toUpperCase(), 14, 15);
          doc.setFontSize(12);
          doc.text(`LAPORAN HPP & LABA KOTOR RESTORAN (${periodName})`, 14, 22);

          const pdfRows = [];
          for (let p in prodSummary) {
            const item = prodSummary[p];
            const recipe = findRecipeForMenu(p);
            const hppUnit = recipe ? calculateMenuHPP(recipe, item.price) : 0;
            const hppTot = hppUnit * item.qty;
            const laba = item.sales - hppTot;
            const pct = item.sales > 0 ? ((hppTot / item.sales) * 100).toFixed(1) : 0;
            pdfRows.push([p, item.cat, `${item.qty} Porsi`, formatRp(item.price), formatRp(hppUnit), formatRp(item.sales), formatRp(hppTot), formatRp(laba), `${pct}%`]);
          }

          pdfRows.push(["TOTAL", "-", "-", "-", "-", formatRp(totalSales), formatRp(totalHPP), formatRp(grossProfit), `${fcr}%`]);

          doc.autoTable({
            startY: 28,
            head: [["Menu Resto", "Kategori", "Terjual", "Harga Jual", "HPP/Porsi", "Net Sales", "Total HPP", "Laba Kotor", "Food Cost %"]],
            body: pdfRows,
            theme: 'grid',
            headStyles: { fillColor: [37, 99, 235] }
          });

          doc.save(`Laporan_HPP_LabaKotor_${periodName}.pdf`);
        }
      } else if (reportType === 'labarugi') {
        const totalOpsExpenses = expenseData.reduce((a, b) => a + b.amount, 0);
        const netProfit = grossProfit - totalOpsExpenses;

        if (format === 'excel') {
          const rows = [
            ["LAPORAN LABA RUGI OPERASIONAL (P&L)"],
            [storeName],
            [`Periode: ${periodName}`],
            [""],
            ["Komponen Keuangan", "Jumlah (Rp)"],
            ["Penjualan Bersih (Net Sales)", totalSales],
            ["Harga Pokok Penjualan (HPP)", totalHPP],
            ["LABA KOTOR (GROSS PROFIT)", grossProfit],
            [""],
            ["BIAYA OPERASIONAL:"]
          ];

          const expCatMap = {};
          expenseData.forEach(x => { expCatMap[x.category] = (expCatMap[x.category] || 0) + x.amount; });
          for (let c in expCatMap) {
            rows.push([` - ${c}`, expCatMap[c]]);
          }

          rows.push(["TOTAL BIAYA OPERASIONAL", totalOpsExpenses]);
          rows.push([""]);
          rows.push(["LABA BERSIH OPERASIONAL (NET PROFIT)", netProfit]);

          const ws = XLSX.utils.aoa_to_sheet(rows);
          tidySheet(ws, rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Laba Rugi");
          XLSX.writeFile(wb, `Laporan_Laba_Rugi_${periodName}.xlsx`);
        } else if (format === 'csv') {
          let csv = `\uFEFFKomponen Keuangan,Nominal (Rp)\n`;
          csv += `"Penjualan Bersih (Net Sales)",${totalSales}\n`;
          csv += `"Harga Pokok Penjualan (HPP)",${totalHPP}\n`;
          csv += `"LABA KOTOR (GROSS PROFIT)",${grossProfit}\n`;
          csv += `"TOTAL BIAYA OPERASIONAL",${totalOpsExpenses}\n`;
          csv += `"LABA BERSIH OPERASIONAL (NET PROFIT)",${netProfit}\n`;

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `Laporan_Laba_Rugi_${periodName}.csv`;
          link.click();
        } else {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          doc.setFontSize(16);
          doc.text(storeName.toUpperCase(), 14, 15);
          doc.setFontSize(12);
          doc.text(`LAPORAN LABA RUGI OPERASIONAL (P&L) - ${periodName}`, 14, 22);

          const expCatMap = {};
          expenseData.forEach(x => { expCatMap[x.category] = (expCatMap[x.category] || 0) + x.amount; });

          const pdfRows = [
            ["Penjualan Bersih (Net Sales)", formatRp(totalSales)],
            ["Harga Pokok Penjualan (HPP)", `(${formatRp(totalHPP)})`],
            ["LABA KOTOR (GROSS PROFIT)", formatRp(grossProfit)],
            ["Biaya Operasional:", ""]
          ];

          for (let c in expCatMap) {
            pdfRows.push([`  • ${c}`, `(${formatRp(expCatMap[c])})`]);
          }

          pdfRows.push(["Total Biaya Operasional", `(${formatRp(totalOpsExpenses)})`]);
          pdfRows.push(["LABA BERSIH OPERASIONAL (NET PROFIT)", formatRp(netProfit)]);

          doc.autoTable({
            startY: 28,
            head: [["Deskripsi / Komponen", "Jumlah"]],
            body: pdfRows,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }
          });

          doc.save(`Laporan_Laba_Rugi_${periodName}.pdf`);
        }
      } else if (reportType === 'aruskas') {
        const cashIn = totalSales;
        const cashOut = expenseData.reduce((a, b) => a + b.amount, 0);
        const netCashFlow = cashIn - cashOut;

        if (format === 'excel') {
          const rows = [
            ["LAPORAN ARUS KAS (CASH FLOW)"],
            [storeName],
            [`Periode: ${periodName}`],
            [""],
            ["Kategori Arus Kas", "Nominal (Rp)"],
            ["ARUS KAS MASUK (Cash Inflow):", ""],
            [" - Penerimaan Penjualan Kasir POS", cashIn],
            ["TOTAL ARUS KAS MASUK", cashIn],
            [""],
            ["ARUS KAS KELUAR (Cash Outflow):", ""]
          ];

          expenseData.forEach(x => {
            rows.push([` - ${x.desc} (${x.category})`, x.amount]);
          });

          rows.push(["TOTAL ARUS KAS KELUAR", cashOut]);
          rows.push([""]);
          rows.push(["KENAIKAN / (PENURUNAN) BERSIH KAS", netCashFlow]);

          const ws = XLSX.utils.aoa_to_sheet(rows);
          tidySheet(ws, rows);
          const wb = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(wb, ws, "Arus Kas");
          XLSX.writeFile(wb, `Laporan_Arus_Kas_${periodName}.xlsx`);
        } else if (format === 'csv') {
          let csv = `\uFEFFKategori Arus Kas,Nominal (Rp)\n`;
          csv += `"TOTAL ARUS KAS MASUK",${cashIn}\n`;
          csv += `"TOTAL ARUS KAS KELUAR",${cashOut}\n`;
          csv += `"ARUS KAS BERSIH (NET CASH FLOW)",${netCashFlow}\n`;

          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
          const link = document.createElement('a');
          link.href = URL.createObjectURL(blob);
          link.download = `Laporan_Arus_Kas_${periodName}.csv`;
          link.click();
        } else {
          const { jsPDF } = window.jspdf;
          const doc = new jsPDF();

          doc.setFontSize(16);
          doc.text(storeName.toUpperCase(), 14, 15);
          doc.setFontSize(12);
          doc.text(`LAPORAN ARUS KAS (CASH FLOW) - ${periodName}`, 14, 22);

          const pdfRows = [
            ["Arus Kas Masuk dari Penjualan POS", formatRp(cashIn)],
            ["Total Arus Kas Masuk", formatRp(cashIn)],
            ["Arus Kas Keluar Operasional:", ""]
          ];

          expenseData.forEach(x => {
            pdfRows.push([`  • ${x.desc}`, `(${formatRp(x.amount)})`]);
          });

          pdfRows.push(["Total Arus Kas Keluar", `(${formatRp(cashOut)})`]);
          pdfRows.push(["ARUS KAS BERSIH (NET CASH FLOW)", formatRp(netCashFlow)]);

          doc.autoTable({
            startY: 28,
            head: [["Deskripsi Transaksi Kas", "Nominal"]],
            body: pdfRows,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] }
          });

          doc.save(`Laporan_Arus_Kas_${periodName}.pdf`);
        }
      }

      closeFinancialExportModal();
    }

    /* ==========================================================================
       SIMPAN PERUBAHAN (data tersimpan di dalam file HTML)
       ========================================================================== */
    function saveRawDataToStorage() {
      try {
        localStorage.setItem('resto_sim_rawdata', JSON.stringify({
          rows: rawData,
          label: document.getElementById('data-status-badge').innerText
        }));
      } catch (e) { console.warn('Data transaksi terlalu besar untuk localStorage:', e); }
    }

    function loadRawDataFromStorage() {
      try {
        const raw = localStorage.getItem('resto_sim_rawdata');
        if (!raw) return false;
        const obj = JSON.parse(raw);
        if (!obj.rows || obj.rows.length === 0) return false;
        rawData = obj.rows;
        document.getElementById('data-status-badge').innerText = obj.label || `DATA TERSIMPAN (${rawData.length} Item)`;
        populateFilterOptions();
        applyFilters();
        return true;
      } catch (e) { return false; }
    }

    function applySeedSnapshot() {
      try {
        const seed = JSON.parse(document.getElementById('sim-seed').textContent || '{}');
        if (!seed || !seed.savedAt || !seed.keys) return;
        // File ini sudah pernah dimuat di browser ini -> edit terbaru di browser tetap dipakai
        const applied = localStorage.getItem('resto_sim_seed_applied');
        // Jika browser sudah memuat data yang sama / lebih baru, pakai edit terbaru di browser
        if (applied && new Date(applied) >= new Date(seed.savedAt)) return;
        Object.keys(seed.keys).forEach(k => localStorage.setItem(k, seed.keys[k]));
        localStorage.setItem('resto_sim_seed_applied', seed.savedAt);
      } catch (e) { console.warn('Gagal memuat data tersimpan:', e); }
    }

    function refreshSaveLabel() {
      const el = document.getElementById('last-saved-label');
      if (!el) return;
      const iso = localStorage.getItem('resto_sim_seed_applied');
      const base = iso ? ('Tersimpan: ' + new Date(iso).toLocaleString('id-ID')) : '';
      el.innerText = unsavedChanges ? ((base ? base + ' • ' : '') + '● Ada perubahan belum disimpan') : base;
      el.style.color = unsavedChanges ? '#fde68a' : '';
      el.style.fontWeight = unsavedChanges ? '700' : '';
    }

    function updateLastSavedLabel(iso) { refreshSaveLabel(); }

    // Tulis ulang semua data yang masih ada di memori ke localStorage agar tidak ada edit yang terlewat
    function flushAllToStorage() {
      [saveRecipesToStorage, saveStockToStorage, saveExpensesToStorage, saveOrgMembersToStorage, saveRawDataToStorage]
        .forEach(fn => { try { fn(); } catch (e) { console.warn('Flush gagal:', fn.name, e); } });
    }

    function saveChangesToHTML() {
      try {
        flushAllToStorage();
        const keys = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith('resto_sim_') && k !== 'resto_sim_seed_applied') keys[k] = localStorage.getItem(k);
        }
        const savedAt = new Date().toISOString();
        const json = JSON.stringify({ savedAt: savedAt, keys: keys }).replace(/</g, '\\u003c');

        // Tandai sebagai tersimpan SEBELUM serialisasi agar label di file hasil unduhan sudah benar
        _origSetItem.call(localStorage, 'resto_sim_seed_applied', savedAt);
        unsavedChanges = false;
        refreshSaveLabel();

        // Salin DOM, tutup modal yang sedang terbuka agar file tidak tersimpan dalam keadaan modal terbuka
        const clone = document.documentElement.cloneNode(true);
        clone.querySelectorAll('.modal-overlay.active, .modal.active').forEach(m => m.classList.remove('active'));
        // Simpan dalam keadaan BELUM login supaya saat dibuka lagi tampil halaman login
        const cBody = clone.querySelector('body');
        if (cBody) cBody.classList.remove('sim-authenticated');
        const cLogin = clone.querySelector('#sim-login-screen');
        if (cLogin) cLogin.style.removeProperty('display');
        const cLogout = clone.querySelector('#sim-logout-btn');
        if (cLogout) cLogout.style.display = 'none';
        const html = '<!DOCTYPE html>\n' + clone.outerHTML.replace(
          /<script id="sim-seed" type="application\/json">[\s\S]*?<\/script>/,
          () => '<script id="sim-seed" type="application/json">' + json + '<\/script>'
        );

        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'Dashboard_SIM_SavedData.html';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(link.href), 4000);

        alert('Perubahan tersimpan!\nBuka file "Dashboard_SIM_SavedData.html" hasil unduhan (di folder Download) untuk melanjutkan dengan edit terakhir.');
      } catch (e) {
        console.error(e);
        alert('Gagal menyimpan perubahan: ' + e.message);
      }
    }

    document.addEventListener('keydown', (ev) => {
      if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 's') {
        ev.preventDefault();
        saveChangesToHTML();
      }
    });

    /* Transaksi baru dari Kasir (tab lain pada folder/origin yang sama) langsung masuk ke Dashboard */
    (function () {
      let timer = null;
      window.addEventListener('storage', (ev) => {
        if (ev.key !== 'world_taste_pos_app_data' || !ev.newValue) return;
        clearTimeout(timer);
        timer = setTimeout(() => mergePOSIntoDashboard(true), 400);
      });
    })();

    /* INITIALIZATION */
    window.addEventListener('DOMContentLoaded', () => {
      document.getElementById('exp-date').value = new Date().toISOString().slice(0, 10);
      applySeedSnapshot();
      loadCustomizationTheme();
      loadOrgMembersFromStorage();
      loadExpensesFromStorage();
      loadStockFromStorage();
      loadRecipesFromStorage();
      loadRawDataFromStorage() || syncWithHTML1Data();
      mergePOSIntoDashboard();
      ensurePosMenusInMargin();
      ensureStockMenuSync();
      applyFilters();
      refreshSaveLabel();
      renderOrg();
      renderExpenses();
      renderStock();
      // Proses pemuatan awal bukan "perubahan pengguna"
      setTimeout(() => { unsavedChanges = false; refreshSaveLabel(); }, 800);
    });
  
