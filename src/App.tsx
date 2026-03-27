import { useState, ReactNode } from 'react';
import { LayoutDashboard, Network, Play, Settings, Activity, Bot, CalendarDays, FolderKanban, Database, Terminal, FileText, Plus, X, Lightbulb } from 'lucide-react';
import { ProjectTree } from './components/ProjectTree';
import { SkillCenter } from './components/SkillCenter';
import { Dashboard } from './components/Dashboard';
import { GanttChart } from './components/GanttChart';
import { ResourceCenter } from './components/ResourceCenter';
import { TaskTemplateCenter } from './components/TaskTemplateCenter';
import { OntologyGraphCenter } from './components/OntologyGraphCenter';
import { DataAdapterCenter } from './components/DataAdapterCenter';
import { ParameterEngine } from './components/ParameterEngine';
import { SimulationCenter } from './components/SimulationCenter';
import { Project, mockProjects } from './types';

import { Toaster } from './components/ui/sonner';

export default function App() {
  const [activeTab, setActiveTab] = useState('gantt');
  const [globalNav, setGlobalNav] = useState('projects');
  const [projects, setProjects] = useState<Project[]>(mockProjects);
  const [currentProjectId, setCurrentProjectId] = useState(mockProjects[0].id);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectTemplate, setNewProjectTemplate] = useState('环保设备制造');

  const currentProject = projects.find(p => p.id === currentProjectId) || projects[0];

  const handleUpdateProject = (updatedProject: Project) => {
    setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
  };

  const handleCreateProject = () => {
    const newProject: Project = {
      id: `P00${projects.length + 1}`,
      name: newProjectName || '未命名项目',
      description: '新创建的项目',
      template: newProjectTemplate,
      nodes: newProjectTemplate === '环保设备制造' ? JSON.parse(JSON.stringify(mockProjects[0].nodes)) : [],
      edges: newProjectTemplate === '环保设备制造' ? JSON.parse(JSON.stringify(mockProjects[0].edges)) : [],
      ganttTasks: newProjectTemplate === '环保设备制造' ? JSON.parse(JSON.stringify(mockProjects[0].ganttTasks)) : []
    };
    setProjects([...projects, newProject]);
    setCurrentProjectId(newProject.id);
    setIsCreateModalOpen(false);
    setNewProjectName('');
  };

  const renderContent = () => {
    if (globalNav === 'skills') return <SkillCenter />;
    if (globalNav === 'resources') return <ResourceCenter />;
    if (globalNav === 'templates') return <TaskTemplateCenter />;
    if (globalNav === 'ontology') return <OntologyGraphCenter />;
    if (globalNav === 'data') return <DataAdapterCenter />;
    if (globalNav === 'parameters') return <ParameterEngine />;

    const props = { project: currentProject, onUpdateProject: handleUpdateProject };

    switch (activeTab) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'tree':
        return <ProjectTree {...props} />;
      case 'gantt':
        return <GanttChart {...props} />;
      case 'simulation':
        return <SimulationCenter {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  const getTabTitle = () => {
    if (globalNav === 'skills') return '规则与能力中心';
    if (globalNav === 'resources') return '资源中心';
    if (globalNav === 'templates') return '任务节点模板配置中心';
    if (globalNav === 'ontology') return '非标项目执行与推演中心';
    if (globalNav === 'data') return '数据接入适配层';
    if (globalNav === 'parameters') return '默认参数体系';

    switch (activeTab) {
      case 'gantt': return '1. 项目规划';
      case 'tree': return '2. 节点网络与智能决策';
      case 'simulation': return '3. 推演与决策中心';
      case 'dashboard': return '4. 执行监控';
      default: return '项目规划 (Project Planning)';
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Top Navigation */}
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 font-serif font-bold text-lg tracking-tight text-primary">
            <Activity className="w-5 h-5" />
            <span>决策系统</span>
          </div>
          <nav className="flex items-center gap-1">
            <TopNavItem 
              icon={<FolderKanban className="w-4 h-4" />} 
              label="项目" 
              isActive={globalNav === 'projects'} 
              onClick={() => { setGlobalNav('projects'); setActiveTab('gantt'); }} 
            />
            <TopNavItem
              icon={<Lightbulb className="w-4 h-4" />}
              label="技能"
              isActive={globalNav === 'skills'}
              onClick={() => setGlobalNav('skills')}
            />
            <TopNavItem 
              icon={<Database className="w-4 h-4" />} 
              label="资源" 
              isActive={globalNav === 'resources'} 
              onClick={() => setGlobalNav('resources')} 
            />
            <TopNavItem 
              icon={<FileText className="w-4 h-4" />} 
              label="模板" 
              isActive={globalNav === 'templates'} 
              onClick={() => setGlobalNav('templates')} 
            />
            <TopNavItem
              icon={<Network className="w-4 h-4" />}
              label="项目图谱"
              isActive={globalNav === 'ontology'}
              onClick={() => setGlobalNav('ontology')}
            />
            <TopNavItem 
              icon={<Database className="w-4 h-4" />} 
              label="数据接入" 
              isActive={globalNav === 'data'} 
              onClick={() => setGlobalNav('data')} 
            />
            <TopNavItem 
              icon={<Settings className="w-4 h-4" />} 
              label="参数配置" 
              isActive={globalNav === 'parameters'} 
              onClick={() => setGlobalNav('parameters')} 
            />
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm font-mono text-muted-foreground">
          <span>v2.0.0-测试版</span>
          <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center border border-border">
            <span className="text-xs font-bold">A</span>
          </div>
        </div>
      </header>

      {/* Main Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar (Module Switch) */}
        {globalNav === 'projects' && (
          <aside className="w-64 border-r border-border bg-card/50 flex flex-col shrink-0">
            <div className="p-4 border-b border-border">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-2">当前项目</div>
              <div className="flex items-center gap-2">
                <select 
                  value={currentProjectId}
                  onChange={(e) => setCurrentProjectId(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-none text-sm p-2 font-medium focus:outline-none focus:ring-1 focus:ring-primary truncate"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.id} - {p.name}</option>
                  ))}
                </select>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-9 h-9 shrink-0 flex items-center justify-center bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                  title="新建项目"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
              <div className="text-xs font-mono uppercase tracking-wider text-muted-foreground mb-4 mt-2">操作模块</div>
              <NavItem 
                icon={<CalendarDays className="w-4 h-4" />} 
                label="1. 项目规划" 
                isActive={activeTab === 'gantt'} 
                onClick={() => setActiveTab('gantt')} 
              />
              <NavItem 
                icon={<Network className="w-4 h-4" />} 
                label="2. 节点网络与智能决策" 
                isActive={activeTab === 'tree'} 
                onClick={() => setActiveTab('tree')} 
              />
              <NavItem 
                icon={<Activity className="w-4 h-4" />} 
                label="3. 推演与决策中心" 
                isActive={activeTab === 'simulation'} 
                onClick={() => setActiveTab('simulation')} 
              />
              <NavItem 
                icon={<LayoutDashboard className="w-4 h-4" />} 
                label="4. 执行监控" 
                isActive={activeTab === 'dashboard'} 
                onClick={() => setActiveTab('dashboard')} 
              />
            </nav>
          </aside>
        )}

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background relative">
          <header className="h-12 border-b border-border flex items-center px-6 bg-card/30 shrink-0">
            <h2 className="font-serif font-medium text-base">{getTabTitle()}</h2>
          </header>
          <div className="flex-1 overflow-auto p-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Bottom Bar: Logs / Agent */}
      <footer className="h-8 border-t border-border bg-card flex items-center justify-between px-4 shrink-0 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span>系统在线</span>
          </div>
          <div className="flex items-center gap-1.5 border-l border-border pl-4">
            <Terminal className="w-3 h-3" />
            <span>最新日志：[信息] 求解器约束更新成功</span>
          </div>
        </div>
        <div className="flex items-center gap-2 cursor-pointer hover:text-primary transition-colors" onClick={() => { setGlobalNav('projects'); setActiveTab('agent'); }}>
          <Bot className="w-3 h-3" />
          <span>AI助手就绪</span>
        </div>
      </footer>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-card border border-border w-[500px] shadow-2xl flex flex-col">
            <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
              <h3 className="font-serif font-medium">新建项目</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase text-muted-foreground">项目名称</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={e => setNewProjectName(e.target.value)}
                  className="w-full bg-background border border-border p-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="例如：新型除尘器研发"
                />
              </div>
              <div className="space-y-3">
                <label className="text-xs font-mono uppercase text-muted-foreground">行业初始化包</label>
                <div className="grid grid-cols-1 gap-3">
                  <div 
                    className={`p-3 border cursor-pointer transition-colors ${newProjectTemplate === '环保设备制造' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setNewProjectTemplate('环保设备制造')}
                  >
                    <div className="font-medium text-sm flex items-center justify-between">
                      大型装备定制
                      {newProjectTemplate === '环保设备制造' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      包含: 120+ 流程节点, 35个 Task 模板, 完整 6M Node Pack, 默认技能库
                    </div>
                  </div>
                  <div 
                    className={`p-3 border cursor-pointer transition-colors ${newProjectTemplate === '水处理系统' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setNewProjectTemplate('水处理系统')}
                  >
                    <div className="font-medium text-sm flex items-center justify-between">
                      水处理系统
                      {newProjectTemplate === '水处理系统' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      包含: 80+ 流程节点, 20个 Task 模板
                    </div>
                  </div>
                  <div 
                    className={`p-3 border cursor-pointer transition-colors ${newProjectTemplate === '通用制造' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
                    onClick={() => setNewProjectTemplate('通用制造')}
                  >
                    <div className="font-medium text-sm flex items-center justify-between">
                      通用制造
                      {newProjectTemplate === '通用制造' && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 font-mono">
                      空白模板，需手动配置所有节点和规则
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t border-border bg-muted/20 flex justify-end gap-2">
              <button onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground border border-border bg-background">取消</button>
              <button onClick={handleCreateProject} className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90">创建项目</button>
            </div>
          </div>
        </div>
      )}
      <Toaster />
    </div>
  );
}

function TopNavItem({ icon, label, isActive, onClick }: { icon: ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm transition-colors rounded-none border-b-2 ${
        isActive 
          ? 'border-primary text-primary font-medium bg-primary/5' 
          : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function NavItem({ icon, label, isActive, onClick }: { icon: ReactNode, label: string, isActive: boolean, onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-none border-l-2 ${
        isActive 
          ? 'border-primary bg-primary/10 text-primary font-medium' 
          : 'border-transparent text-muted-foreground hover:bg-secondary hover:text-secondary-foreground'
      }`}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
