多模态融合目标检测系统使用说明

整理日期：2026年10月23日

一、系统概述

多模态融合目标检测系统用于接入雷达与网络摄像头两路数据。摄像头画面由YOLOv8完成目标检测，雷达通过TCP接收点迹数据，两路数据依据预先标定的单应性矩阵映射至同一地面坐标系，并计算相对风险场，最终在网页驾驶舱中显示。

系统包内包含一段现场实测记录，涵盖雷达、视觉、融合三套数据及采样录像。即使不连接任何硬件，也可运行完整界面并完成历史回放演示。

二、历史回放

无需连接硬件即可查看系统效果。双击根目录下的“启动历史回放.cmd”，浏览器打开 http://127.0.0.1:4173/ 。启动后出现的黑色命令行窗口必须保持打开，关闭该窗口会导致网页连接中断。结束回放时按Ctrl+C停止。

页面顶部设有进度条，可拖动至任意时刻。实测记录总时长为238.6秒，目标内容较集中的区段为6至14秒、52至76秒、156至162秒和170至218秒。其余时间段现场本身无目标，画面正常但不会显示检测框，这是数据本身的特征。

回放至结尾后会自动从头循环播放，演示过程中无需额外操作。实时模式与回放模式均占用3001后端端口和4173网页端口，切换模式前应先按Ctrl+C关闭上一个实例。

三、页面功能

页面顶部包含四个页签：总览、雷达探测、摄像头感知和风险场。总览页左侧显示摄像头画面，右上显示雷达小地图，右下显示风险场，可快速掌握整体情况。雷达探测页以扇形PPI显示目标距离、方位角和径向速度。摄像头感知页以大画面显示检测框、类别和置信度。风险场页显示地面XY平面的风险热图和等高线。

页面左侧为当前选中目标的详情，右侧为目标列表。点击画面中的检测框或列表中的条目可切换目标。按空格键暂停或继续，按F键进入全屏。测试用例位于web/src目录下，与界面运行无关，答辩时无需关注。

四、连接真实硬件的配置

连接真实硬件前需完成三项配置。

第一，配置网卡地址。雷达和摄像头分别使用不同网段，电脑需配置两块对应网卡。雷达侧本机地址为192.168.10.50，子网掩码为255.255.255.0；摄像头侧本机地址为192.168.1.50，子网掩码为255.255.255.0。两块网卡均不要设置网关和DNS，以免影响正常上网。配置完成后使用ipconfig确认上述地址确实存在。

第二，修改config/devices.json。radar.host为雷达IP，当前为192.168.10.123；radar.port为雷达TCP端口，当前为50000；radar.localAddress为电脑连接雷达所用网卡地址；camera.rtspUrl为摄像头RTSP地址，当前为rtsp://192.168.1.11/；camera.localAddress为电脑连接摄像头所用网卡地址；camera.pythonPath为采集和推理使用的python.exe路径，留空则使用项目内的.venv；camera.enabled设为false时仅运行雷达，不启动摄像头。radar.localAddress和camera.localAddress必须是ipconfig中真实存在的地址，后端会显式绑定这两个地址连接设备，填写错误会直接报EADDRNOTAVAIL。adapterAlias和adapterGuid仅作为备注，程序不校验，可填写也可不填写。

第三，配置摄像头Python环境。当前config中填写的是上一台电脑的路径，包内.venv-camera也是基于该电脑的Python 3.9创建，更换机器后无法使用。应使用本机Python 3.10或3.11重新创建环境，示例命令如下：

D:\Python311\python.exe -m venv .venv
.venv\Scripts\python.exe -m pip install --upgrade pip
.venv\Scripts\python.exe -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cpu
.venv\Scripts\python.exe -m pip install -r requirements-camera.txt

随后将camera.pythonPath配置为.venv/Scripts/python.exe。该路径为相对路径，更换机器后无需修改。如电脑配有NVIDIA显卡，可将torch安装步骤替换为官网提供的CUDA版本，以显著提升速度；无显卡时只能使用CPU，检测帧率会低于原电脑。

完成配置后，先双击“自检.cmd”，确认雷达和摄像头两项均通过，再双击“启动实时系统.cmd”。

五、故障排查

双击cmd窗口闪一下就消失时，先确认没有误点web目录中的旧脚本，该目录下两个脚本仅启动前端，不启动后端。提示端口被占用时，通常为上一个窗口仍在运行，按Ctrl+C关闭后重新启动。页面一直转圈且无画面时，检查黑色命令行窗口是否被关闭，并查看logs目录中的后端和前端日志。雷达显示“网卡未就绪”时，说明本机不存在config中配置的IP地址，应返回第四节第一步检查网卡配置。摄像头无画面时，检查RTSP地址是否正确，以及Python环境中的opencv、torch、ultralytics是否安装完好；摄像头若为H.265编码，连接后需等待数秒以获取关键帧。风险场显示“未知”时，表示当前没有与雷达关联上的目标，系统不会将其视为零风险，这是设计行为。

如需查看设备和配置的详细自检结果，可双击“自检.cmd”，或在该目录下执行：

node launch.mjs --check
node check-devices.mjs

六、目录说明

web目录为前端源码，采用Vue 3与TypeScript，包含测试及打包后的dist。sentinel-backend目录为后端源码，采用Fastify，包含测试、dist、摄像头采集脚本和媒体文件。models/yolov8n.pt为检测模型。数据保存目录存放现场实测记录，包括视觉、雷达和融合数据。sentinel-backend/media目录存放回放用录像和采样帧，共787帧。config/devices.json为设备地址和Python路径配置。launch.mjs为启动入口，live用于实时硬件，recording用于历史回放。settings.mjs负责读取config并拼接环境变量。启动历史回放.cmd用于运行回放，启动实时系统.cmd用于运行实时系统，自检.cmd用于环境检查和设备连通性检查。说明/雷达和摄像头连接说明.txt包含接线、设备地址和现场排查细节。验证记录目录存放当时的实测记录、截图和打包检查结果。licenses目录存放模型相关的第三方许可证。

七、代码开发

前端开发可在web目录执行npm ci安装依赖，npm run dev进入开发模式，npm run build生成产物，npm test运行测试。后端开发可在sentinel-backend目录执行npm ci安装依赖，npm run build编译，npm test运行测试。根目录launch.mjs运行的是dist中的成品，修改源码后需重新build方可生效。
