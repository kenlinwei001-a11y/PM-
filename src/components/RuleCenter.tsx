import { useState } from 'react';
import { mockRules } from '../types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Switch } from './ui/switch';
import { Button } from './ui/button';
import { Plus, Code } from 'lucide-react';

export function RuleCenter() {
  const [rules, setRules] = useState(mockRules);

  const toggleRule = (id: string) => {
    setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="font-serif text-xl">规则中心 (Rule Center) - 行业预置规则库</h2>
        <Button className="rounded-none font-mono uppercase tracking-wider text-xs h-8">
          <Plus className="w-4 h-4 mr-2" /> 新建规则
        </Button>
      </div>

      <Card className="rounded-none border-border shadow-none overflow-hidden flex-1 flex flex-col">
        <CardHeader className="border-b border-border bg-muted/20 py-3">
          <CardTitle className="text-sm font-mono uppercase tracking-wider">活跃规则 (Active Rules)</CardTitle>
        </CardHeader>
        <CardContent className="p-0 flex-1 overflow-auto">
          <div className="grid grid-cols-[1.5fr_1fr_1fr_100px] gap-4 p-4 border-b border-border bg-muted/50 font-medium text-xs uppercase tracking-wider font-serif italic opacity-70 sticky top-0 z-10">
            <div>规则名称</div>
            <div>类型</div>
            <div>作用域</div>
            <div className="text-right">状态</div>
          </div>
          {rules.map(rule => (
            <div key={rule.id} className="border-b border-border hover:bg-muted/10 transition-colors">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_100px] gap-4 p-4 items-center">
                <div className="font-sans font-medium text-sm">{rule.name}</div>
                <div className="text-xs font-mono uppercase text-muted-foreground">{rule.ruleType}</div>
                <div className="text-xs font-mono uppercase text-muted-foreground">{rule.scope}</div>
                <div className="flex justify-end">
                  <Switch 
                    checked={rule.isActive} 
                    onCheckedChange={() => toggleRule(rule.id)}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </div>
              <div className="px-4 pb-4">
                <div className="p-3 bg-muted/30 border border-border/50 rounded-none font-mono text-xs text-muted-foreground whitespace-pre-wrap flex items-start gap-2">
                  <Code className="w-4 h-4 mt-0.5 opacity-50 shrink-0" />
                  <code>{rule.expression}</code>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
