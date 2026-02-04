const zh = {
  narrative: {
    phases: {
      boarding: {
        default: {
          0: {
            title: '在 ${departure} 登机',
            content: '机舱内弥漫着航空燃油和咖啡的气味，乘客们正在放置行李。在外面，地勤人员正在为我们的出发做准备。“欢迎乘坐 ${callsign}，”乘务员通过广播宣布。${aircraft} 已经准备好前往 ${arrival} 的旅程。'
          },
          1: {
            title: '最后登机广播',
            content: '乘客们正在入座。机组人员正在进行最后的检查。机长欢迎大家登机。“我们将飞往 ${arrival}，旅途愉快。”舱门很快就要关闭了。'
          },
          2: {
            title: '飞行前检查',
            content: '驾驶舱准备工作正在进行中。检查燃油、航线和系统。“登机结束，”登机口工作人员确认。廊桥正在撤回。我们要出发了。'
          }
        },
        sunny: {
            0: {
                title: '阳光明媚的出发',
                content: '当乘客登机时，阳光透过窗户照射进来。这是飞行的好天气。“欢迎来到 ${callsign}，”机组人员热情地问候大家。'
            }
        },
        rainy: {
            0: {
                title: '雨中登机',
                content: '乘客们匆忙登机，雨水敲打着机身。“请小心脚下，”机组人员建议道。前往 ${arrival} 的是一个阴雨天。'
            }
        },
        shakespearean: {
            0: {
                title: '舞台已就绪',
                content: '朋友们，罗马人，同胞们，请听我说！我们将踏上前往 ${arrival} 的旅程。铁鸟正在等待它的主人。'
            }
        }
      },
      departure_clearance: {
        default: {
          0: {
            title: 'IFR 放行',
            content: '无线电发出滋滋声。“${callsign}，许可前往 ${arrival}，按飞行计划航线飞行。爬升并保持 FL350。离场频率 124.7。应答机 4211。”系统上线时，你复诵了放行许可。'
          },
          1: {
            title: '放行交付',
            content: '“${callsign}，准备抄收放行许可。”“许可前往 ${arrival}，保持 5000，起飞后 10 分钟预期 FL350。”笔在纸上沙沙作响。“复诵正确。”'
          },
          2: {
            title: '航线确认',
            content: '正在核实前往 ${arrival} 的航线。“收到放行许可，”副驾驶点点头。设置 FMS 并检查应答机代码。准备推出。'
          }
        },
        shakespearean: {
            0: {
                title: '获准通行',
                content: '以太之神已发话！我们要获准通往 ${arrival} 之地。让我们飞升吧！'
            }
        }
      },
      pushback: {
        default: {
          0: {
            title: '推出许可',
            content: '拖车连接时轻轻一震。“地面呼叫驾驶舱，刹车松开。”当你启动引擎时，航站楼慢慢远去。APU 的嗡嗡声被主涡轮的轰鸣声取代。'
          },
          1: {
            title: '启动引擎',
            content: '“推出完成，设置停留刹车。”“启动 2 号引擎。”N2 上升，随后是燃油流量和点火。启动正常。“启动 1 号引擎。”'
          },
          2: {
            title: '更好的推出',
            content: '拖车将我们推到滑行道上。“许可启动。”引擎啸叫着苏醒。“拖杆已断开，左侧手势信号。”我们依靠自己的动力了。'
          }
        },
        rainy: {
            0: {
                title: '湿滑推出',
                content: '推出时雨水划过挡风玻璃。停机坪在灯光下闪闪发光。“引擎启动许可。”喷气流在我们身后卷起水雾。'
            }
        },
        shakespearean: {
            0: {
                title: '我们后退',
                content: '我们后退是为了前进！野兽苏醒，呼吸着火焰和烟雾。解开我们的束缚！'
            }
        }
      },
      taxiing: {
        default: {
          0: {
            title: '滑行至跑道 ${departureRunway}',
            content: '“${callsign}，经由 Alpha, Bravo 滑行至跑道 ${departureRunway}。”你松开停留刹车。当你穿过迷宫般的滑行道时，轮胎有节奏地敲击着混凝土接缝。阳光在停机坪上闪烁。'
          },
          1: {
            title: '滑行指令',
            content: '“在 27L 跑道外等待。”我们滑过重型喷气式飞机。“给右边的 747 让路。”前往等待点。起飞襟翼已设置。'
          },
          2: {
            title: '移动中',
            content: '滑行至使用跑道。执行飞行控制检查。“客舱乘务员，准备起飞。”长长的飞机队伍等待起飞。'
          }
        },
        sunny: {
            0: {
                title: '阳光滑行',
                content: '滑行时阳光刺眼。热浪在跑道上闪烁。“滑行至等待点。”准备飞行。'
            }
        },
        rainy: {
            0: {
                title: '湿滑滑行',
                content: '雨刷开启。滑行道灯光在水坑中反射。“注意，报告刹车效应中等。”我们小心地滑行至跑道。'
            }
        },
        shakespearean: {
            0: {
                title: '行军开始',
                content: '我们向命运进军！道路曲折，但目的地明确。前往跑道！'
            }
        }
      },
      takeoff_prep: {
        default: {
          0: {
            title: '对正并等待',
            content: '在跑道 ${departureRunway} 上对正。刹车设置。引擎慢车。“塔台，${callsign} 在跑道 ${departureRunway} 等待，准备起飞。”检查襟翼、配平并核实起飞数据。'
          },
          1: {
            title: '等待位置',
            content: '等待交通清除。“跑道 ${departureRunway}，进跑道等待。”我们在中心线上对正。跑道在我们面前延伸。'
          },
          2: {
            title: '最后检查',
            content: '起飞前检查单完成。“接近离场。”引擎稳定。“准备好了吗？”机长问道。“准备好了，”你回答。'
          }
        },
        rookie: {
            title: '准备起飞',
            content: '你已在跑道上。向前推油门起飞！达到速度时向后拉杆。'
        },
        shakespearean: {
            0: {
                title: '悬崖边缘',
                content: '我们站在世界的边缘！天空在召唤。我们是飞翔，还是坠落？'
            }
        }
      },
      takeoff: {
        default: {
          0: {
            title: '起飞许可',
            content: '在跑道 ${departureRunway} 上对正。“风向 130，风速 8，跑道 ${departureRunway} 许可起飞。”油门向前。引擎轰鸣，将你推向座椅。在 Vr 抬轮。'
          },
          1: {
            title: '滑跑',
            content: '“起飞推力设置。”80 节。“V1，抬轮。”机头离开地面。我们将大地抛在身后。'
          },
          2: {
            title: '离地',
            content: '全马力。跑道变得模糊。拉起。轮子离开停机坪。“正上升率，收轮。”我们在飞翔。'
          }
        },
        rookie: {
            title: '起飞！',
            content: '全马力！拉起！你在飞翔！'
        },
        rainy: {
            0: {
                title: '雨中起飞',
                content: '轮子卷起水雾。油门向前。我们穿过雨水冲入云层。'
            }
        },
        shakespearean: {
            0: {
                title: '飞升',
                content: '我们反抗重力！大地无法束缚我们。向上，向上，进入天堂！'
            }
        }
      },
      initial_climb: {
        default: {
          0: {
            title: '正上升率',
            content: '大地在脚下远去。“收轮。”穿过低层云层进入阳光中。${departure} 城市在下方缩小成微型网格。速度增加到 250 节。'
          },
          1: {
            title: '爬升离场',
            content: '“联系离场台。”“爬升至 5000。”收襟翼。景色壮观。按航向飞行。'
          },
          2: {
            title: '离场',
            content: '转向切入径向线。“保持 250 节。”机场现在远远落在后面。平稳爬升。'
          }
        },
        rookie: {
            title: '爬升',
            content: '保持爬升！不要太快也不要太慢。'
        },
        sunny: {
            0: {
                title: '阳光爬升',
                content: '穿过雾霾进入灿烂的阳光。下面的世界像一张地图。爬升至巡航高度。'
            }
        },
        rainy: {
            0: {
                title: '多云爬升',
                content: '进入云层。能见度下降。仪表飞行。湍流震动着机翼。'
            }
        },
        shakespearean: {
            0: {
                title: '更高',
                content: '我们在钢铁之翼上翱翔！云层是我们的领地。更高，更高！'
            }
        }
      },
      main_climb: {
        default: {
          0: {
            title: '爬升至巡航',
            content: '通过 10,000 英尺。“加速至巡航速度。”随着我们上升，天空变暗成深蓝色。空气平稳。平稳爬升至 FL350。'
          },
          1: {
            title: '通过 FL180',
            content: '“标准气压。”空气稀薄而寒冷。引擎在这里效率很高。为长途飞行安顿下来。'
          },
          2: {
            title: '高高度',
            content: '接近爬升顶点。地球的曲线清晰可见。“2 点钟方向有交通。”我们在高空航路中。'
          }
        },
        shakespearean: {
            0: {
                title: '顶峰',
                content: '我们伸手摘星！空气稀薄，但我们情绪高昂。向着目的地前进！'
            }
        }
      },
      cruise: {
        0: {
          title: '巡航在 FL350',
          content: '保持在 35,000 英尺。地平线是一条弯曲的雾霾线。“保持马赫数 0.78。” 引擎发出稳定、令人安心的轰鸣声。乘客们正在为飞往 ${arrival} 的旅程安顿下来。'
        },
        1: {
          title: '航路中',
          content: '导航正常。“系统正常。” 自动驾驶仪精确地跟踪航线。窗外，云层在下方形成白色的毯子。“客舱服务已开始。”'
        },
        2: {
          title: '稳定航向',
          content: '飞行计算机显示我们按计划飞行。燃油消耗在限制范围内。“联系区调 132.5。” 切换频率。在这个高度，无线电通话很少。'
        }
      },
      descent: {
        default: {
          0: {
            title: '开始下降',
            content: '收油门。随着我们开始下降，机头微微下沉。“下降并保持 10,000 英尺。”目的地 ${arrival} 就在前方。'
          },
          1: {
            title: '正在下降',
            content: '“在 12,000 通过限制。”打开扰流板减速。${arrival} 的城市灯光在远处出现。准备进近。'
          },
          2: {
            title: '进场准备',
            content: '检查进场通播。“高度表拨正。”客舱乘务员准备着陆。穿云下降。'
          }
        },
        rainy: {
            0: {
                title: '雨中下降',
                content: '下降进入阴霾。雨水再次拍打窗户。“预期 ILS 进近。”雷达显示前方有风暴。'
            }
        },
        shakespearean: {
            0: {
                title: '归来',
                content: '我们从王座上降临！大地重新接纳我们。准备回归尘世。'
            }
        }
      },
      approach: {
        default: {
          0: {
            title: '进近 ${arrival}',
            content: '对正跑道 ${landingRunway}。“放下起落架，襟翼 30。”跑道入口在雾霾中隐约可见。速度检查，航向道截获。'
          },
          1: {
            title: '五边进近',
            content: '“许可着陆。”三盏绿灯。检查单完成。专注于接地区。1000 英尺。'
          },
          2: {
            title: '短五边',
            content: '500 英尺。进近稳定。“着陆检查。”跑道灯光常亮。快到了。'
          }
        },
        rainy: {
            0: {
                title: '风暴进近',
                content: '对抗侧风。雨刷高速档。跑道从雾中显现。“决断高度。”继续。'
            }
        },
        shakespearean: {
            0: {
                title: '着陆',
                content: '大地向我们冲来！稳住，稳住。我们将亲吻大地！'
            }
        }
      },
      landing: {
        default: {
          0: {
            title: '接地',
            content: '拉平... 接地。扰流板放出。反推轰鸣。“${callsign}，欢迎来到 ${arrival}。”刹车减速至滑行速度。'
          },
          1: {
            title: '已着陆',
            content: '稳固接地。“收减速板，反推正常。”减速。“下一个滑行道脱离。”我们做到了。'
          },
          2: {
            title: '到达',
            content: '完美着陆。平稳滑跑。“欢迎来到 ${arrival}。”乘客鼓掌。脱离跑道。'
          }
        },
        rainy: {
            0: {
                title: '湿滑着陆',
                content: '水漂风险。重着陆以破坏水膜。水花四溅。安全减速。'
            }
        },
        shakespearean: {
            0: {
                title: '平安归来',
                content: '我们回来了！旅程结束。荣耀归于飞行员！'
            }
        }
      },
      after_land_taxiing: {
        default: {
          0: {
            title: '滑行至登机口',
            content: '“下一个滑行道左转，联系地面。”飞行结束。滑过其他飞机前往指定登机口。'
          },
          1: {
            title: '泊位',
            content: '清理飞机。收襟翼，关灯。接近航站楼。引导员挥手示意我们进入。'
          },
          2: {
            title: '到达登机口',
            content: '“停留刹车已设置。”引擎正在关车。安全带指示灯熄灭。欢迎回家。'
          }
        }
      },
      shutoff: {
        default: {
          0: {
            title: '飞行结束',
            content: '飞机已停稳，系统关闭。感谢您的飞行。'
          },
          2: {
            content: '飞行任务已结束。请检查数据记录或返回主菜单。'
          }
        }
      }
    }
  },
  failures: {
    engine: {
      minor: '引擎 ${engineIndex + 1} 显示异常振动。密切监视。',
      critical: '引擎 ${engineIndex + 1} 失效！需要立即采取行动！',
      resolved: '引擎 ${engineIndex + 1} 恢复正常运行。'
    },
    hydraulic: {
      minor: '主液压压力下降。检查系统。',
      critical: '主液压系统失效！需要手动控制！',
      resolved: '液压压力稳定。系统恢复。'
    },
    electrical: {
      minor: '电气汇流条 ${bus} 经历间歇性断电。',
      critical: '主电气汇流条失效！应急电源接通！',
      resolved: '电气汇流条电源恢复正常水平。'
    },
    fuel: {
      minor: '检测到燃油不平衡。交叉供油自动接通。',
      critical: '检测到燃油泄漏！燃油正在快速流失！',
      resolved: '燃油不平衡已解决。'
    },
    default: {
      minor: '检测到系统 ${type} 故障。',
      critical: '系统 ${type} 严重故障！',
      resolved: '系统 ${type} 已恢复。'
    }
  },
  ui: {
    debug: {
        title: '飞行数据 & LNAV',
        lat: '纬度:',
        lon: '经度:',
        alt: '高度:',
        ias: '指示空速:',
        gs: '地速:',
        mode: '模式:',
        engaged: '激活',
        off: '关闭',
        tgt_hdg: '目标航向:',
        hdg_err: '航向误差:',
        tgt_roll: '目标滚转:',
        act_roll: '实际滚转:',
        ils_status: 'ILS 状态',
        dist: '距离:',
        loc_err: '航向道误差:',
        gs_err: '下滑道误差:',
        tgt_alt: '目标高度',
        next_wp: '下一航点:',
        wp_index: '航点索引:'
    },
    flight: {
        time_zulu: '时间 (Zulu)',
        fuel: '燃油',
        oil: '滑油',
        pax: '乘客',
        distance: '距离',
        altitude: '高度',
        speed: '速度',
        heading: '航向',
        vertical_speed: '垂直速度',
        throttle: '油门',
        flaps: '襟翼',
        gear: '起落架',
        brakes: '刹车',
        parking_brake: '停留刹车',
        spoilers: '扰流板',
        messages: {
            freq_busy: '频率繁忙。请稍候。'
        }
    },
    panels: {
        overhead_button: '系统面板 [OH PNL]',
        pfd: '主飞行显示器',
        nd: '导航显示器',
        engine_systems: '引擎与系统',
        fuel: '燃油',
        system_status: '系统状态 / 警报',
        controls: '飞行控制',
        flaps: '襟翼',
        gear: '起落架',
        brakes: '刹车',
        trim: '配平',
        systems: {
        status: '系统状态',
        hydraulics: '液压系统',
        hydraulics_abbrev: '液压',
        electrics: '电气系统',
        electrics_abbrev: '电气',
        warnings: '警告',
        no_warnings: '无激活警告',
        on: '开启',
        off: '关闭'
    },
    active_failures: '当前故障',
        no_active_alerts: '无警报',
        next_wp: '下一航点',
        wp_index: '航点索引',
        tgt_alt: '目标高度'
    },
    flight_computer: {
        title: '飞行计算机',
        tabs: {
            plan: '计划',
            add: '添加',
            nearest: '最近',
            radio: '无线电',
            utils: '工具',
            perf: '性能'
        },
        plan: {
            empty: '飞行计划中无航点。',
            end_of_plan: '飞行计划结束',
            hold: '等待',
            holding: '等待中',
            active: '(当前)'
        },
        add: {
            manual_entry: '手动输入',
            lat_placeholder: '纬度 (例 37.61)',
            lon_placeholder: '经度 (例 -122.37)',
            label_placeholder: '标签 (可选)',
            add_coordinates: '添加坐标',
            or: '或',
            airport_search: '机场搜索',
            search_placeholder: '搜索 ICAO/IATA/名称...',
            search_types: {
                all: '全部',
                normal: '普通',
                emergency: '紧急'
            },
            search_btn: '搜索',
            add_to_plan: '+ 添加至计划',
            no_results: '未找到机场。',
            alerts: {
                invalid_coords: '请输入有效的坐标',
                invalid_freq: '无效频率。必须在 108.00 到 117.95 MHz 之间'
            },
            searching: '正在搜索...'
        },
        nearest: {
            title: '最近机场 (前 20)',
            loading: '正在查找最近机场...',
            finding: '正在查找机场...',
            empty: '附近未找到机场。',
            no_results: '未找到机场。',
            add_btn: '+ 添加',
            refresh: '刷新',
            emergency_tag: '紧急'
        },
      radio: {
            title: '导航无线电',
            current_freq: '当前 NAV1 频率',
            set_freq: '设置频率 (MHz)',
            tune: '调频',
            common_freqs: '常见 ILS 频率: 108.10, 108.15, ..., 111.95'
        },
        utils: {
            title: '预测',
            next_wp: '下一航点:',
            distance: '距离:',
            ete: '预计到达:',
            fuel_flow: '燃油流量:',
            time_empty: '耗尽时间:',
            target_alt: '目标高度 (ft):',
            time_alt: '到达高度时间:',
            wrong_vs: '垂直速度方向错误',
            stable: '稳定'
        },
        converter: {
            title: '单位转换器',
            value_placeholder: '数值',
            result: '结果:',
            units: {
                ft: '英尺 (ft)',
                m: '米 (m)',
                kts: '节 (kts)',
                kmh: '千米/小时',
                inHg: '英寸汞柱',
                hPa: '百帕',
                nm: '海里',
                km: '千米'
            }
        }
    },
    header: {
        awaiting: '等待飞行指令...',
        prepare: '准备起飞。',
        checklist_incomplete: '⚠️ 检查单未完成',
        situation: '当前情况'
    },
    loading: {
        starting_simulation: '正在启动飞行模拟...',
        initializing_physics: '正在初始化物理引擎...'
    },
    error: {
        initialization_error: '初始化错误',
        reload_page: '重新加载页面'
    },
    common: {
        critical: '严重'
    },
    messages: {
        cannot_proceed_missing_items: '无法继续。缺失项目：${items}'
    },
    menu: {
        resume: '继续飞行',
        restart: '重新开始',
        settings: '设置',
        quit: '退出到主菜单',
        language: 'Language / 语言'
    },
    systems: {
        engines: '引擎',
        engine: '引擎',
        electrics: '电力',
        hydraulics: '液压',
        fuel: '燃油',
        apu: 'APU',
        pumps: '泵',
        generators: '发电机',
        batteries: '电池',
        on: '开启',
        off: '关闭',
        auto: '自动',
        avail: '可用',
        fault: '故障',
        low_press: '低压',
        status: '系统状态',
        warnings: '警告',
        no_warnings: '无活动警告'
    },
    startup: {
        checklist_incomplete: '启动检查单未完成',
        missing_items: '缺失项目: ${items}',
        cant_proceed: '无法进入下一阶段。',
        continue_anyway: '强制继续 (禁用安全保护)',
        continue: '继续',
        sys_init: '系统初始化',
        checklist: {
            systems_not_init: '系统未初始化',
            battery_on: '电池必须开启',
            adirs_nav: 'ADIRS IR 开关必须在 NAV 位置',
            adirs_aligning: 'ADIRS 校准中 (${progress}%)',
            apu_bleed_on: 'APU 引气必须开启',
            apu_gen_on: 'APU 发电机必须开启',
            apu_running: 'APU 必须运行并稳定',
            engine_running: '引擎 ${index} 必须运行',
            gen_on: '发电机 ${index} 必须开启',
            apu_shutdown: '引擎启动后 APU 必须关闭',
            adirs_complete: 'ADIRS 校准必须完成'
        }
    },
    warnings: {
        gpws: {
            pull_up: '拉升 (PULL UP)',
            terrain: '地形 (TERRAIN)',
            too_low_gear: '高度低 起落架 (TOO LOW GEAR)',
            too_low_flaps: '高度低 襟翼 (TOO LOW FLAPS)'
        },
        stall: '失速 (STALL)',
        overspeed: '超速 (OVERSPEED)',
        bank_angle: '倾角过大 (BANK ANGLE)',
        fire: {
            eng1: '引擎 1 火警',
            eng2: '引擎 2 火警',
            apu: 'APU 火警'
        },
        hydraulics: {
            a_low: '液压 A 压力低',
            b_low: '液压 B 压力低'
        },
        elec: {
            emer_config: '电力 应急构型'
        },
        cabin_alt: '客舱高度 (CABIN ALT)',
        fuel_low: '燃油低',
        engine_fail: '引擎 ${index} 失效',
        config: {
            flaps: '起飞构型 襟翼',
            spoilers: '起飞构型 扰流板',
            brakes: '起飞构型 刹车'
        },
        tail_strike: '擦尾风险'
    },
    radio: {
        cancel: '取消',
        transmit: '发送',
        preview: '预览',
        select: '选择...',
        enter: '输入 ${param}...',
        frequency_type: '频率类型',
        busy: '频率繁忙',
        tabs: {
            READBACK: '复诵',
            REQUEST: '请求',
            INFORM: '通报'
        },
        template: {
            ack: { label: '收到', text: '收到, ${callsign}.' },
            wilco: { label: '照办', text: '照办, ${callsign}.' },
            rb_alt: { label: '复诵高度', text: '上升并保持 ${altitude}, ${callsign}.' },
            rb_hdg: { label: '复诵航向', text: '${direction}转 航向 ${heading}, ${callsign}.' },
            rb_freq: { label: '复诵频率', text: '联系 ${station} 频率 ${frequency}, ${callsign}.' },
            rb_taxi: { label: '复诵滑行', text: '经 ${route} 滑行, 跑道 ${runway} 外等待, ${callsign}.' },
            req_alt: { label: '请求高度', text: '${station}, ${callsign} 请求上升/下降至 ${altitude}.' },
            req_direct: { label: '请求直飞', text: '${station}, ${callsign} 请求直飞 ${waypoint}.' },
            req_land: { label: '请求着陆', text: '${station}, ${callsign} 进近, 请求着陆.' },
            req_startup: { label: '请求开车', text: '${station}, ${callsign} 准备好开车和推出.' },
            req_taxi: { label: '请求滑行', text: '${station}, ${callsign} 准备好滑行.' },
            req_takeoff: { label: '请求起飞', text: '${station}, ${callsign} 准备好起飞, 跑道 ${runway}.' },
            req_atis: { label: '请求通播', text: '${station}, ${callsign} 请求当前天气 / ATIS.' },
            req_freq_change: { label: '请求换频', text: '${station}, ${callsign} 请求离开频率.' },
            inf_checkin: { label: '联系', text: '${station}, ${callsign} 听你指挥, 高度 ${altitude}.' },
            inf_pos: { label: '位置报告', text: '${station}, ${callsign} 过 ${waypoint} 高度 ${altitude}.' },
            inf_mayday: { label: '宣布紧急', text: 'MAYDAY MAYDAY MAYDAY, ${station}, ${callsign} 宣布紧急情况: ${failure}. 请求立即返航/备降.' },
            inf_pan: { label: '宣布PanPan', text: 'PAN-PAN PAN-PAN PAN-PAN, ${station}, ${callsign} 遇到 ${issue}. 请求优先着陆.' }
        }
    },
    narrative: {
        awaiting: '等待指令...',
        phases: {
            boarding: {
                default: {
                    0: {
                        title: '正在 ${departure} 登机',
                        content: '客舱内弥漫着燃油和咖啡的味道，乘客们正在安放行李。窗外，地勤人员正在为出发做准备。"${callsign}，欢迎登机，" 乘务员通过广播宣布。${aircraft} 已准备好前往 ${arrival}。'
                    },
                    1: {
                        title: '最后登机广播',
                        content: '乘客们正在就座。机组人员正在进行最后的检查。机长欢迎大家登机。"前方前往 ${arrival} 的飞行将会很平稳。" 舱门即将关闭。'
                    },
                    2: {
                        title: '起飞前检查',
                        content: '驾驶舱准备工作正在进行。检查燃油、航路和系统。"登机完毕，" 登机口工作人员确认。廊桥撤回。我们准备出发。'
                    }
                }
            },
            takeoff_prep: {
                default: {
                    0: {
                        title: '起飞准备',
                        content: '正在进行起飞前最后检查。系统正常，跑道 ${departureRunway} 已准备就绪。${callsign} 准备起飞。'
                    },
                    1: {
                        title: '座舱准备',
                        content: '设置起飞推力。检查仪表。${aircraft} 已准备好从 ${departure} 出发。'
                    },
                    2: {
                        title: '起飞前最后检查',
                        content: '检查所有控制表面。襟翼已设置。准备接收 ${departureRunway} 跑道的起飞许可。'
                    }
                }
            }
        }
    },
    initialization: {
    title: '天际浩劫 - 航班初始化',
    subtitle: '配置您的飞行参数并选择难度等级',
    steps: {
      1: '01. 操作等级与情报',
      2: '02. 飞行参数',
      3: '03. 航线选择'
    },
    difficulty: {
      rookie: '菜鸟',
      amateur: '业余',
      intermediate: '中级',
      advanced: '高级',
      pro: '职业',
      devil: '魔鬼'
    },
    intel: {
      label: '机组情报:',
      descriptions: {
        rookie: '高度支持。NPC 协助所有检查。严格遵守标准程序。',
        amateur: '经验丰富的机组。在重大事件中提供可靠支持。NPC 会提供协助。',
        intermediate: '标准操作。机组听从指挥并精确执行命令。',
        advanced: '能力尚可，但在高压条件下容易犹豫或犯小错误。',
        pro: '高压力。机组表现紧张，在紧急情况下容易犯重大错误。',
        devil: '独立优先。可能会主动偏离程序。不要依赖协助。'
      }
    },
    params: {
      airline: '航空公司',
      callsign: '呼号',
      aircraft_type: '机型',
      crew_count: '机组人数',
      passengers: '乘客 (PAX)',
      payload: '载重 (KG)',
      cruise_height: '巡航高度 (FT)',
      reserve_fuel: '备用燃油 (小时)',
      zulu_time: '祖鲁时间',
      season: '季节',
      seasons: {
        Spring: '春季',
        Summer: '夏季',
        Autumn: '秋季',
        Winter: '冬季'
      },
      random: '随机'
    },
    route: {
      departure: '起飞机场',
      arrival: '到达机场',
      summary: {
        route: '航线:',
        distance: '距离:',
        est_time: '预计时间:',
        fuel_req: '燃油需求:',
        trip: '航程',
        rsv: '备用',
        total: '总计'
      }
    },
    buttons: {
      next_params: '下一步: 飞行参数 →',
      next_route: '下一步: 航线选择 →',
      finalize: '完成签派并初始化'
    }
  },
  narrative_generator: {
      roles: [
        '机长', 
        '指挥官', 
        '责任机长', 
        '船长', 
        '总飞行师'
      ],
      experience: {
        rookie: [
          '刚从飞行学院毕业。执照上的墨迹未干。',
          '进入航空公司的第一周。虽然紧张，但雄心勃勃。',
          '还在向总飞行师证明自己。今天的每一个操作都很重要。',
          '第一次坐在左座。别忘了你的训练。'
        ],
        amateur: [
          '正在积累飞行小时数。你了解这架飞机，但它有时仍会让你惊讶。',
          '随着每一段航程建立自信。你处理过平静的天空，但今天可能不同。',
          '不再是学员，但还不是老手。机组人员指望你那双稳定的手。',
          '开始在驾驶舱里感到自在，尽管复杂的系统仍需全神贯注。'
        ],
        intermediate: [
          '准备晋升的资深副驾驶。你对程序烂熟于心。',
          '拥有数千小时经验的飞行员。标准操作已成为第二天性。',
          '可靠且稳重。航空公司把最有价值的航线托付给你。',
          '能力强且专注。你见过恶劣天气和技术故障。'
        ],
        advanced: [
          '资深机长。在机组休息室里，人们怀着敬意低声谈论你的名字。',
          '天空的老兵。你曾穿越飓风，并在引擎熄火的情况下着陆。',
          '教员考官。你编写了别人正在努力学习的手册。',
          '这支机队的掌舵者。飞机感觉就像你身体的延伸。'
        ],
        pro: [
          '传奇飞行员。据说你能在侧风中降落在邮票大小的地方。',
          '王牌飞行员。系统故障只是你展示技能的机会。',
          '精英中的精英。当别人恐慌时，你只是看看手表。',
          '精英指挥官。再也没有什么能让你惊讶，即使是液压完全丧失。'
        ],
        devil: [
          '挑战极限的试飞员。安全裕度只是建议。',
          '驾驶一架被诅咒的飞机。当你走向停机坪时，机械师们在胸前划十字。',
          '面对不可能。困难重重，这正是你喜欢的。',
          '即将体验一场旨在摧毁你的模拟。祝好运。'
        ]
      },
      flight_plan: [
        '今天的舱单显示有 ${pax} 名乘客搭乘从 ${departure} 到 ${arrival} 的航班。',
        '你已获准执行从 ${departure} 到 ${arrival} 的航线，搭载着依赖你的 ${pax} 名乘客。',
        '飞行计划已提交：${departure} 起飞，目的地 ${arrival}。${pax} 名乘客正在安顿下来。',
        '从 ${departure} 的登机口到 ${arrival} 的停机坪，你今天要对 ${pax} 条生命负责。'
      ],
      difficulty: {
        rookie: [
          '系统报告正常。专注于你的决策和标准程序。',
          '预计会有一次例行飞行，只需完成少量程序性任务。你的机组人员全力支持。',
          '前方任务简单明了。可能会出现小问题，但没什么基本逻辑解决不了的。'
        ],
        amateur: [
          '预计会遇到一个重大的操作挑战。保持简单，遵循检查单。',
          '今天你可能会遇到有影响的情况，但你的机组人员已准备好协助处理工作量。',
          '警惕一个重大事件。直接控制需求仍然很低，让你专注于管理。'
        ],
        intermediate: [
          '准备好应对动态情况和潜在干扰。这一段航程需要手动飞行。',
          '适用标准飞行协议，但要准备好应对优先级变化和主动控制需求。',
          '你的机组人员将精确执行你的命令，但环境正变得越来越不可预测。'
        ],
        advanced: [
          '多个关键问题可能同时发生。敏锐的机动和快速的决策至关重要。',
          '预计会有致命场景，手动控制不可商量。注意你的机组人员——他们在压力下可能会动摇。',
          '模拟今天将测试你的反应。动态故障需要持续关注和人工干预。'
        ],
        pro: [
          '系统性故障迫在眉睫。自动化不可靠；你是主要的控制回路。',
          '需要复杂的 CRM 和熟练的机动。你的机组人员压力很大，容易犯重大错误。',
          '致命的、相互关联的问题将挑战你的每一项技能。预计工作量很大，支持也会很紧张。'
        ],
        devil: [
          '预计会出现完全混乱。没有自动驾驶，没有安全网，没有可靠的协助。',
          '飞机被推向极限。你的机组人员可能会主动使情况复杂化。',
          '忘记你的训练——这是为了生存。每个系统都是潜在的威胁，你的“帮手”也有自己的算盘。'
        ]
      }
    },
  },
  weather: {
    clear: '晴朗',
    cloudy: '多云',
    rain: '下雨',
    storm: '暴风雨',
    fog: '雾',
    snow: '下雪'
  },
  failures: {
    engine_failure: '引擎故障',
    engine_fire: '引擎火警',
    hydraulic_failure: '液压故障',
    electrical_failure: '电力故障',
    instrument_failure: '仪表故障',
    fuel_leak: '燃油泄漏',
    structural_damage: '结构损坏'
  }
};

export default zh;
