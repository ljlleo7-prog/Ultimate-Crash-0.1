const zh = {
  common: {
    loading: "加载中...",
    error: "错误",
    close: "关闭",
    cancel: "取消",
    confirm: "确认",
    select: "选择...",
    back: "返回",
    next: "下一步",
    random: "随机",
    settings: "设置",
    language: "语言",
    devMode: "开发者模式"
  },
  initialization: {
    title: "航班初始化",
    subtitle: "配置您的飞行参数",
    sections: {
      difficulty: "01. 运行等级 & 情报",
      parameters: "02. 飞行参数",
      route: "03. 航路选择"
    },
    difficulty: {
      rookie: "见习",
      amateur: "业余",
      intermediate: "中级",
      advanced: "高级",
      pro: "专家",
      devil: "地狱",
      intel_label: "机组智能:",
      descriptions: {
        rookie: "高度支持。NPC协助所有检查。严格遵循标准程序。",
        amateur: "经验丰富的机组。在重大事件中提供可靠支持。NPC会提供协助。",
        intermediate: "标准操作。机组跟随指引并精确执行指令。",
        advanced: "能力强，但在高压条件下可能犹豫或犯小错。",
        pro: "高压环境。机组表现紧张，紧急情况下易犯重大错误。",
        devil: "独立优先级。可能主动偏离程序。不要依赖协助。",
        waiting: "等待选择难度..."
      }
    },
    parameters: {
      airline: "航空公司",
      callsign: "呼号",
      aircraft_type: "机型",
      crew_count: "机组人数",
      passengers: "乘客 (PAX)",
      payload: "载重 (KG)",
      cruise_height: "巡航高度 (FT)",
      reserve_fuel: "备用燃油 (HOURS)",
      zulu_time: "祖鲁时间",
      season: "季节",
      random_checkbox: "随机",
      seasons: {
        spring: "春",
        summer: "夏",
        autumn: "秋",
        winter: "冬"
      },
      placeholders: {
        operator: "运营人名称",
        flight_number: "航班号",
        count_range: "1-10",
        pax_range: "0-1000",
        weight_unit: "KG",
        height_unit: "FT",
        time_format: "HH:MMZ",
        hours: "HRS"
      }
    },
    route: {
      departure: "出发机场",
      arrival: "到达机场",
      search_placeholder: "搜索 ICAO/IATA..."
    },
    summary: {
      route: "航线:",
      distance: "距离:",
      est_time: "预计时间:",
      fuel_req: "燃油需求:",
      trip: "航程",
      rsv: "备用",
      total: "总计"
    },
    buttons: {
      next_params: "下一步: 飞行参数 →",
      next_route: "下一步: 航路选择 →",
      finalize: "完成签派 & 初始化"
    },
    messages: {
      random_initialized: "随机航班已初始化！",
      error_random: "初始化随机航班出错，请重试。"
    }
  },
  flight: {
    status: {
      starting: "正在启动飞行模拟...",
      init_physics: "正在初始化物理引擎...",
      error: "初始化错误",
      reload: "重新加载页面",
      situation: "态势",
      checklist_incomplete: "检查单未完成",
      active_failures: "当前故障",
      critical: "严重",
      awaiting_instructions: "等待飞行指令...",
      prepare_takeoff: "准备起飞。",
      flight_ended: "飞行结束",
      return_init: "返回初始化"
    },
    sidebar: {
      checklist: "检查单",
      f_comp: "飞控电脑",
      systems: "系统",
      timer: "计时器",
      save_load: "存档/读取",
      inspect: "检查",
      settings: "设置"
    },
    panels: {
      radio: {
        title: "无线电",
        transmit: "发送",
        freq_busy: "频段繁忙",
        placeholder: "输入消息...",
        frequency: "频率"
      },
      systems: {
        engines: "引擎",
        hydraulics: "液压",
        electrics: "电力",
        fuel: "燃油"
      }
    }
  }
};

export default zh;
