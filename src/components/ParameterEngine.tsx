import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Save, Zap, Users, Package, Settings, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ParameterEngine() {
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success('全局参数已更新');
    }, 800);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center bg-card p-4 border border-border">
        <h2 className="font-serif text-xl font-medium">默认参数体系</h2>
        <Button onClick={handleSave} disabled={isSaving} className="rounded-none font-mono">
          {isSaving ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          保存全局配置
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-2 gap-6 max-w-5xl mx-auto">
          
          {/* Energy Parameters */}
          <Card className="rounded-none border-border shadow-none">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <Zap className="w-4 h-4 text-orange-500" /> 能源与公用事业
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">工业用电单价 (¥/kWh)</Label>
                  <Input type="number" defaultValue="0.85" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">工业用水单价 (¥/m³)</Label>
                  <Input type="number" defaultValue="4.20" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">天然气单价 (¥/m³)</Label>
                  <Input type="number" defaultValue="3.50" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">碳排放成本 (¥/吨)</Label>
                  <Input type="number" defaultValue="60.00" className="rounded-none font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Labor Parameters */}
          <Card className="rounded-none border-border shadow-none">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> 人力成本基准
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">初级技工时薪 (¥/h)</Label>
                  <Input type="number" defaultValue="45.00" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">高级技工时薪 (¥/h)</Label>
                  <Input type="number" defaultValue="80.00" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">工程师时薪 (¥/h)</Label>
                  <Input type="number" defaultValue="120.00" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">加班费率乘数</Label>
                  <Input type="number" defaultValue="1.5" className="rounded-none font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Machine Parameters */}
          <Card className="rounded-none border-border shadow-none">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <Settings className="w-4 h-4 text-emerald-500" /> 设备折旧与维护
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">默认折旧年限 (年)</Label>
                  <Input type="number" defaultValue="10" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">残值率 (%)</Label>
                  <Input type="number" defaultValue="5" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">年度维护费率 (%)</Label>
                  <Input type="number" defaultValue="2.5" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">设备综合效率 OEE 基准 (%)</Label>
                  <Input type="number" defaultValue="85" className="rounded-none font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Parameters */}
          <Card className="rounded-none border-border shadow-none">
            <CardHeader className="border-b border-border bg-muted/20">
              <CardTitle className="text-base font-serif flex items-center gap-2">
                <Package className="w-4 h-4 text-purple-500" /> 物料与仓储
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-mono text-xs">默认物料损耗率 (%)</Label>
                  <Input type="number" defaultValue="3.0" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">仓储成本 (¥/m²/月)</Label>
                  <Input type="number" defaultValue="35.00" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">资金占用成本 (年化 %)</Label>
                  <Input type="number" defaultValue="4.5" className="rounded-none font-mono text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="font-mono text-xs">采购管理费率 (%)</Label>
                  <Input type="number" defaultValue="1.5" className="rounded-none font-mono text-sm" />
                </div>
              </div>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}
