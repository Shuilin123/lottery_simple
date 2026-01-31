from flask import Flask, request, jsonify, send_from_directory, redirect
import os
from flask_server.config import prizes, EACH_COUNT, COMPANY
from flask_server.help import load_temp_data, save_data_file, save_error_data_file, shuffle, load_excel, write_excel

class WebApp:
    def __init__(self):
        self.BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        self.PRODUCT_DIST = os.path.abspath(os.path.join(self.BASE_DIR, '../product/dist'))
        self.app = Flask(__name__, static_folder=self.PRODUCT_DIST)
        
        # 初始化数据
        self.cur_data = {}
        self.lucky_data = {}
        self.error_data = []
        self.default_type = prizes[0]["type"]
        self.default_page = "default data"
        
        # 加载初始数据
        self.load_data()
        
        # 设置路由
        self.setup_routes()
    
    def setup_routes(self):
        """设置所有路由"""
        @self.app.before_request
        def before_request():
            """设置跨域"""
            from flask import make_response
            res = make_response()
            res.headers["Access-Control-Allow-Origin"] = "*"
            res.headers["Access-Control-Allow-Headers"] = "X-Requested-With"
            res.headers["Access-Control-Allow-Methods"] = "PUT,POST,GET,DELETE,OPTIONS"
            res.headers["X-Powered-By"] = "3.2.1"
            res.headers["Content-Type"] = "application/json;charset=utf-8"
        
        @self.app.route("/", methods=["GET"])
        def index():
            return redirect("/index.html", code=301)
        
        @self.app.route("/getTempData", methods=["POST"])
        def get_temp_data():
            self.get_left_users()
            return jsonify({
                "cfgData": {"prizes": prizes, "EACH_COUNT": EACH_COUNT, "COMPANY": COMPANY},
                "leftUsers": self.cur_data.get("leftUsers", []),
                "luckyData": self.lucky_data
            })
        
        @self.app.route("/reset", methods=["POST"])
        def reset():
            self.lucky_data = {}
            self.error_data = []
            save_error_data_file(self.error_data)
            save_data_file(self.lucky_data)
            return jsonify({"type": "success"})
        
        @self.app.route("/getUsers", methods=["POST"])
        def get_users():
            return jsonify(self.cur_data.get("users", []))
        
        @self.app.route("/getPrizes", methods=["POST"])
        def get_prizes():
            return jsonify(prizes)
        
        @self.app.route("/saveData", methods=["POST"])
        def save_data():
            data = request.json
            self.set_lucky(data.get("type"), data.get("data"))
            return jsonify({"type": "设置成功！"})
        
        @self.app.route("/errorData", methods=["POST"])
        def error_data_api():
            data = request.json
            self.set_error_data(data.get("data"))
            return jsonify({"type": "设置成功！"})
        
        @self.app.route("/export", methods=["POST"])
        def export():
            out_data = [["工号", "姓名", "部门"]]
            for item in prizes:
                out_data.append([item["text"]])
                out_data += self.lucky_data.get(item["type"], [])
            file_path = write_excel(out_data, "抽奖结果.xlsx")
            return jsonify({"type": "success", "url": "抽奖结果.xlsx"})
        
        @self.app.route('/<path:filename>')
        def serve_static(filename):
            resp = send_from_directory(self.PRODUCT_DIST, filename)
            resp.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            return resp
        
        @self.app.errorhandler(404)
        def page_not_found(e):
            return self.default_page, 404
    
    # 逻辑函数
    def set_lucky(self, type_, data):
        if type_ in self.lucky_data:
            self.lucky_data[type_] += data
        else:
            self.lucky_data[type_] = data if isinstance(data, list) else [data]
        save_data_file(self.lucky_data)
    
    def set_error_data(self, data):
        self.error_data += data
        save_error_data_file(self.error_data)
    
    def get_left_users(self):
        lottered_user = set()
        for key in self.lucky_data:
            for item in self.lucky_data[key]:
                lottered_user.add(item[0])
        for item in self.error_data:
            lottered_user.add(item[0])
        left_users = [user for user in self.cur_data.get("users", []) if user[0] not in lottered_user]
        self.cur_data["leftUsers"] = left_users
    
    def load_data(self):
        users_path = os.path.join(os.path.dirname(__file__), "data", "users.xlsx")
        self.cur_data["users"] = load_excel(users_path)
        if self.cur_data["users"]:
            shuffle(self.cur_data["users"])
        temp, error = load_temp_data()
        self.lucky_data = temp
        self.error_data = error
        self.get_left_users()
    
    def run(self, host="0.0.0.0", port=8090, debug=True):
        """运行服务器"""
        self.app.run(host=host, port=port, debug=False, use_reloader=False)