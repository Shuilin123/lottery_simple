from flask import Blueprint, request, jsonify
import os
import json
from werkzeug.utils import secure_filename

prize_bp = Blueprint('prize', __name__)

PRIZE_JSON = os.path.join(os.path.dirname(__file__), 'data', 'prizes.json')
PRIZE_IMG_DIR = os.path.join(os.path.dirname(__file__), 'data', 'prize_img')
os.makedirs(PRIZE_IMG_DIR, exist_ok=True)

# 工具函数

def load_prizes():
    if os.path.exists(PRIZE_JSON):
        with open(PRIZE_JSON, 'r', encoding='utf-8') as f:
            return json.load(f)
    return []

def save_prizes(prizes):
    with open(PRIZE_JSON, 'w', encoding='utf-8') as f:
        json.dump(prizes, f, ensure_ascii=False, indent=2)

# 获取所有奖品
@prize_bp.route('/api/prizes', methods=['GET'])
def get_prizes():
    return jsonify(load_prizes())

# 新增奖品
@prize_bp.route('/api/prizes', methods=['POST'])
def add_prize():
    data = request.json
    prizes = load_prizes()
    new_id = max([p['id'] for p in prizes], default=0) + 1
    prize = {
        'id': new_id,
        'name': data.get('name'),
        'level': data.get('level'),
        'quantity': data.get('quantity'),
        'image': data.get('image', '')
    }
    prizes.append(prize)
    save_prizes(prizes)
    return jsonify({'success': True, 'prize': prize})

# 修改奖品
@prize_bp.route('/api/prizes/<int:pid>', methods=['PUT'])
def update_prize(pid):
    data = request.json
    prizes = load_prizes()
    for p in prizes:
        if p['id'] == pid:
            p['name'] = data.get('name', p['name'])
            p['level'] = data.get('level', p['level'])
            p['quantity'] = data.get('quantity', p['quantity'])
            p['image'] = data.get('image', p['image'])
            save_prizes(prizes)
            return jsonify({'success': True, 'prize': p})
    return jsonify({'success': False, 'msg': 'Prize not found'}), 404

# 删除奖品
@prize_bp.route('/api/prizes/<int:pid>', methods=['DELETE'])
def delete_prize(pid):
    prizes = load_prizes()
    prizes = [p for p in prizes if p['id'] != pid]
    save_prizes(prizes)
    return jsonify({'success': True})

# 图片上传
@prize_bp.route('/api/prize_img', methods=['POST'])
def upload_img():
    if 'file' not in request.files:
        return jsonify({'success': False, 'msg': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'msg': 'No selected file'}), 400
    filename = secure_filename(file.filename)
    save_path = os.path.join(PRIZE_IMG_DIR, filename)
    file.save(save_path)
    rel_path = f'data/prize_img/{filename}'
    return jsonify({'success': True, 'path': rel_path})
