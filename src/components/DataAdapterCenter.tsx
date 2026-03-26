import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, FileSpreadsheet, Database, Link, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function DataAdapterCenter() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeTab, setActiveTab] = useState<'excel' | 'erp' | 'iot'>('excel');

  const handleUpload = () => {
    setIsUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsUploading(false);
          toast.success('数据导入成功，已自动映射到节点模型 (Data imported and mapped successfully)');
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <h2 className="font-serif text-xl font-medium">数据接入适配层 (Data Adapter Layer)</h2>
        <div className="flex bg-muted p-1 rounded-md">
          <button 
            onClick={() => setActiveTab('excel')}
            className={`px-4 py-1.5 text-sm font-mono rounded-sm flex items-center gap-2 ${activeTab === 'excel' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel / CSV
          </button>
          <button 
            onClick={() => setActiveTab('erp')}
            className={`px-4 py-1.5 text-sm font-mono rounded-sm flex items-center gap-2 ${activeTab === 'erp' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <Database className="w-4 h-4" /> ERP API
          </button>
          <button 
            onClick={() => setActiveTab('iot')}
            className={`px-4 py-1.5 text-sm font-mono rounded-sm flex items-center gap-2 ${activeTab === 'iot' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground'}`}
          >
            <Link className="w-4 h-4" /> IoT Stream
          </button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-3 gap-6 min-h-0">
        <div className="col-span-2 flex flex-col gap-6">
          {activeTab === 'excel' && (
            <Card className="flex-1 rounded-none border-border shadow-none flex flex-col">
              <CardHeader className="border-b border-border bg-muted/20">
                <CardTitle className="text-base font-serif">文件上传与自动映射</CardTitle>
                <CardDescription className="font-mono text-xs">支持工时表、材料消耗表、BOM清单</CardDescription>
              </CardHeader>
              <CardContent className="p-6 flex-1 flex flex-col items-center justify-center border-2 border-dashed border-border m-6 bg-muted/10">
                <Upload className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">拖拽文件到此处，或点击上传</h3>
                <p className="text-sm text-muted-foreground mb-6 font-mono">支持 .xlsx, .csv 格式</p>
                <div className="flex gap-4">
                  <Button variant="outline" className="rounded-none font-mono">下载模板</Button>
                  <Button onClick={handleUpload} disabled={isUploading} className="rounded-none font-mono">
                    {isUploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <FileSpreadsheet className="w-4 h-4 mr-2" />}
                    选择文件
                  </Button>
                </div>
                {isUploading && (
                  <div className="w-full max-w-md mt-8 space-y-2">
                    <div className="flex justify-between text-xs font-mono">
                      <span>解析并映射数据...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary transition-all duration-200" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'erp' && (
            <Card className="flex-1 rounded-none border-border shadow-none">
              <CardHeader className="border-b border-border bg-muted/20">
                <CardTitle className="text-base font-serif">ERP 系统对接配置</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">系统类型</Label>
                    <select className="w-full bg-background border border-border p-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary">
                      <option>SAP S/4HANA</option>
                      <option>Oracle ERP</option>
                      <option>用友 NC</option>
                      <option>金蝶 云星空</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">API Endpoint</Label>
                    <Input defaultValue="https://api.erp.company.com/v1" className="rounded-none font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Client ID</Label>
                    <Input type="password" defaultValue="********" className="rounded-none font-mono text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="font-mono text-xs">Client Secret</Label>
                    <Input type="password" defaultValue="********" className="rounded-none font-mono text-sm" />
                  </div>
                </div>
                <Button className="rounded-none font-mono w-full">测试连接 (Test Connection)</Button>
              </CardContent>
            </Card>
          )}

          {activeTab === 'iot' && (
            <Card className="flex-1 rounded-none border-border shadow-none">
              <CardHeader className="border-b border-border bg-muted/20">
                <CardTitle className="text-base font-serif">IoT 设备数据流接入</CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">MQTT Broker URL</Label>
                  <Input defaultValue="mqtt://iot.factory.local:1883" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">Topic 订阅规则</Label>
                  <Input defaultValue="factory/+/machine/+/status" className="rounded-none font-mono text-sm" />
                </div>
                <div className="p-4 bg-muted/30 border border-border font-mono text-xs space-y-2">
                  <div className="text-muted-foreground mb-2">最新接收数据 (Live Stream):</div>
                  <div className="text-green-600">{`{ "device": "WELD_01", "status": "running", "power_kw": 12.5, "temp": 45 }`}</div>
                  <div className="text-green-600">{`{ "device": "CNC_03", "status": "idle", "power_kw": 0.5, "temp": 22 }`}</div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="col-span-1 flex flex-col gap-6">
          <Card className="rounded-none border-border shadow-none">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-serif">数据映射状态</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-border">
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">工时数据 (Labor Hours)</div>
                    <div className="text-xs text-muted-foreground font-mono">最后同步: 10分钟前</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">材料消耗 (Material Usage)</div>
                    <div className="text-xs text-muted-foreground font-mono">最后同步: 1小时前</div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="p-4 flex items-center justify-between bg-red-500/5">
                  <div>
                    <div className="font-medium text-sm text-red-600">设备状态 (Machine Status)</div>
                    <div className="text-xs text-red-500/80 font-mono">同步失败: 连接超时</div>
                  </div>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 rounded-none border-border shadow-none">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-serif">自动映射规则</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="space-y-2">
                <div className="text-sm font-medium">工时表字段映射</div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2 bg-muted/50 border border-border">Excel: 员工姓名</div>
                  <div className="p-2 bg-primary/10 border border-primary/20 text-primary">Node: Man.Name</div>
                  <div className="p-2 bg-muted/50 border border-border">Excel: 实际工时</div>
                  <div className="p-2 bg-primary/10 border border-primary/20 text-primary">Node: Man.WorkHours</div>
                </div>
              </div>
              <Button variant="outline" className="w-full rounded-none font-mono text-xs border-dashed">
                修改映射规则
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
