(function(owner) {
	owner.db = null

	//初始化数据库
	owner.initDB = function() {
		var version = version || 2;
		var request = indexedDB.open('historys',9);
		request.onerror = function(e) {
			console.log("openDB error!");
		};
		request.onsuccess = function(e) {
			owner.db = e.target.result;
			//			alert(2)
//												DB.deleteDB() 
//DB.deleteStore()

		};
		request.onupgradeneeded = function(e) {

			var db = e.target.result;
			if(!db.objectStoreNames.contains('historys')) {
				var store = db.createObjectStore('historys', {
					keyPath: 'messageUId'
				});
				store.createIndex("targetId", "targetId", {
					unique: false
				});
			}
		}
	}
	if(!window.indexedDB) {
		window.alert("Your browser doesn't support a stable version of IndexedDB. Such and such feature will not be available.")
	} else {
		owner.initDB()
	}

	//	添加新数据
	owner.addData = function(msg) {
		var db = owner.db
		if(!db) return;
		var transaction = db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');
		store.put(msg);
	};

	//	读取数据
	owner.getData = function(key, callback) {

		var db = owner.db
		var transaction = db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');
		var request = store.get(key + '');
		request.onsuccess = function(e) {
			var res = e.target.result;
			if(callback)callback(res)
		}
	};

	//	修改数据
	owner.updatedData = function(key, msg) {
		var db = owner.db
		if(!db) return;
		var transaction = db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');
		var request = store.get(key);

		request.onsuccess = function(e) {
			var res = e.target.result
			//			console.log(JSON.stringify(res))
			store.put(msg);
		};
	}

	//	删除记录
	owner.delectData = function(key) {
		var db = owner.db
		if(!db) return;
		var transaction = db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');
		var request = store.get(key);
		request.onsuccess = function(e) {
		
			store.delete(key);
		};
	}

	//	返回history表中的所有数据,(最近联系的列表)
	owner.getCount = function(callback) {
		var arr = [];
		var name = []
		var db = owner.db;
		if(!db) return;
		var transaction = owner.db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');

		var request = store.index("targetId").openCursor()
		request.onsuccess = function(e) {
			var cursor = e.target.result;
			if(cursor) {
				var result = cursor.value;
				var tId = result.targetId;
				if(name.indexOf(tId) < 0 && result.belong ==plus.storage.getItem('myId')) {
					name.push(tId);
					arr.push({
						targetId: tId,
						avatar: result.content.extra.KHavatar,
						nickName: result.content.extra.KHnickName
					})
				}
				cursor.continue();
			} else {
				callback(arr)
			}
		}
	}

	//	删除数据库表
	owner.deleteStore = function() {
		var db = owner.db;
		var transaction = db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');
		store.clear();

	}
	//	删除整个数据库
	owner.deleteDB = function(dbname) {
		//删除数据库
		var db = owner.db
		window.indexedDB.deleteDatabase('historys');
		alert('delectDb')
	}
	//	根据索引查询数据
	owner.getDataByIndex = function(key, callback) {
		var db = owner.db
		var transaction = db.transaction('historys');
		var store = transaction.objectStore('historys');
		var arr = []
		var request = store.index("targetId").openCursor(key)
		request.onsuccess = function(e) {
			var cursor = e.target.result; //匹配到的游标
			if(cursor) {
				var result = cursor.value;

				if(result.belong ==plus.storage.getItem('myId')){
					arr.push(result)
				}
				cursor.continue();
			} else {
				//				alert(arr.length)
				if(callback) callback(arr)
			}
		}
	}
	//	更据索引删除记录
	owner.delectDataByIndex = function(key) {
		var db = owner.db
		var arr = []
		if(!db) return;
		var transaction = db.transaction('historys', 'readwrite');
		var store = transaction.objectStore('historys');

		var request = store.index("targetId").openCursor(key)
		var deleteRequest;
		request.onsuccess = function(e) {
			var cursor = e.target.result; //匹配到的游标
			if(cursor){
					var key = cursor.primaryKey

					arr.push(key)

					cursor.continue();
			}else{
				arr.forEach(function(item,index){
					owner.delectData(item)
				})
			}
			
		}

	}


})(window.DB = {})