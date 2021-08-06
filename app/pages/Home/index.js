/* eslint-disable no-undef */
import React, { Component } from 'react';
import { View, StyleSheet, Text, InteractionManager } from 'react-native';
import { Icon, Button } from 'react-native-elements';
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from 'react-native-popup-menu';
import { observer, inject } from 'mobx-react';
import DateTimePicker from 'react-native-modal-datetime-picker';
import { Api, Tools, Axios } from '../../utils';
// 日报列表组件
import StoriesList from '../../componetns/StoriesList';
// 上滑触底加载状态
import PullUpLoad from '../../componetns/PullUpLoading';
// 集成触底和上拉加载的滚动容器
import MyScrollView from '../../componetns/ScrollView';
// 轮播图组件
import HomeSwiper from './HomeSwiper';
import { AndroidBackHandler } from 'react-navigation-backhandler';
import { YellowBox } from 'react-native';
YellowBox.ignoreWarnings([
  'Require cycles are allowed, but can result in uninitialized values. Consider refactoring to remove the need for a cycle.',
]);
let that; //保存This引用
@inject('theme') //引入主题Store (Mobx)
@inject('app')
@observer //装饰器语法 , 将其转换成可观察的 (Mobx)
class Home extends Component {
  // 配置标题栏参数
  static navigationOptions = ({ navigation, screenProps }) => {
    let { params } = navigation.state;
    let { tooglePopupMenu } = params || {};

    return {
      title: navigation.getParam('title'),
      headerStyle: {
        backgroundColor: screenProps.theme,
      },
      headerLeft: (
        <Button
          type="clear"
          onPress={() => {
            navigation.openDrawer();
          }}
          icon={<Icon type="material" name="menu" size={24} color="white" />}
        />
      ),
      headerRight: (
        <View style={styles.headerRightWrapper}>
          <Button
            type="clear"
            onPress={() => {
              that.toggleDateTimePicker();
            }}
            icon={
              <Icon type="antdesign" name="calendar" size={24} color="white" />
            }
          />
          <Button
            type="clear"
            onPress={() => {
              that.handleHistoryClick();
            }}
            icon={
              <Icon type="material" name="history" size={25} color="white" />
            }
          />
          <Button
            type="clear"
            onPress={() => tooglePopupMenu()}
            icon={
              <Icon type="material" name="more-vert" size={24} color="white" />
            }
          />
        </View>
      ),
    };
  };

  constructor(props) {
    super(props);
    this.state = {
      stories: [], //列表数据
      topStories: [], //轮播图数据
      pullUpLoading: false, //控制上滑加载Loading显示标识符
      title: '', //标题栏(Header)标题
      refresh: false, //控制下拉刷新loading显示标识符
      listHeight: [], //记录日报列表高度变化
      opened: false, //控制Header弹出菜单显示
      isDateTimePickerVisible: false, //控制日期选择控件显示
      finished: false, //判断列表是否全部加载完
    };
    // 默认标题
    this.props.navigation.setParams({ title: '首页' });
    // 保存this引用
    that = this;
  }

  componentDidMount() {
    // 页面初始化
    this.init();
    // 传递到navigation (navigation中无法使用this调用)
    this.props.navigation.setParams({ tooglePopupMenu: this.tooglePopupMenu });
    this.props.navigation.setParams({
      handleHistoryClick: this.handleHistoryClick,
    });
  }

  init() {
    /*
     * 根据网络状态初始化数据
     * 连接网络时 获取最新数据 ，无网络时显示缓存的数据
     */
    Tools.getNetworkState().then(newWorkInfo => {
      if (newWorkInfo.online) {
        this.setState({
          refresh: true,
        });
      }
      // 是否获取远程数据
      let syncInBackgroundState = !newWorkInfo.online;
      // 获取远程或者本地的数据
      storage
        .load({ key: 'latest', syncInBackground: syncInBackgroundState })
        .then(responseJson => {
          this.handleDataRender(responseJson);
        })
        .catch(() => {
          this.setState({
            refresh: false,
          });
        });
    });
  }
  /**
   * 下拉刷新
   */
  bindOnRefresh() {
    // 下拉刷新请求最新数据
    this.setState({ refresh: true });
    Axios.get(Api.latest)
      .then(responseJson => {
        this.setState({ refresh: false });
        this.handleDataRender(responseJson.data);
      })
      .catch(() => {
        this.setState({ refresh: false });
      });
  }

  /**
   * 处理首屏数据渲染
   * @oaram  {responseJson} data 数据对象
   */
  handleDataRender(responseJson) {
    if (!responseJson || !responseJson.stories) {
      Tools.toast('服务器数据格式异常');
      return false;
    }
    // 读取数据访问状态
    this.updateVistedState(responseJson.stories, res => {
      let data = [
        {
          key: responseJson.date,
          data: res,
        },
      ];
      this.setState(
        {
          topStories: responseJson.top_stories,
          stories: data,
          refresh: false,
          listHeight: [], //重置列表高度数组
          finished: false,
        },
        () => {
          // 当最新的日报数量较少时  触发触底加载 , 避免数据少时页面无法滚动 ,无法加载更多日报.
          if (this.state.stories[0].data.length <= 3) {
            this.pullupfresh();
          }
        },
      );
    });
  }

  /**
   * 读取列表项访问状态 (访问过的日报 标题变为灰色)
   * @param {Object} lsitData 列表数据对象
   * @param {Function} callback 回调函数
   */
  updateVistedState(listData, callback) {
    listData.map((item, listIndex) => {
      storage
        .load({
          key: 'visited',
          id: item.id,
        })
        .then(() => {
          // 标记已访问
          item.visited = true;
          if (listIndex === listData.length - 1) {
            callback(listData);
          }
        })
        // 未访问
        .catch(() => {
          item.visited = false;
          if (listIndex === listData.length - 1) {
            callback(listData);
          }
        });
    });
  }

  /**
   *  上滑触底数据加载
   */
  pullupfresh = () => {
    //避免重复请求
    if (this.state.pullUpLoading) {
      return false;
    }
    this.setState({
      pullUpLoading: true,
    });
    // 获得日期
    let beforeDay = this.state.stories[this.state.stories.length - 1].key;
    console.log("beforeday", beforeDay);
    storage
      .load({
        key: 'before',
        id: beforeDay,
      })
      .then(responseJson => {
        if (responseJson && responseJson.stories.length === 0) {
          this.setState({
            finished: true,
            pullUpLoading: false,
          });
        } else if (!responseJson || !responseJson.stories) {
          Tools.toast('服务器数据异常');
          this.setState({
            pullUpLoading: false,
          });
        } else {
          // 获取数据访问状态
          this.updateVistedState(responseJson.stories, res => {
            // 合并数据
            let newData = this.state.stories.concat({
              key: responseJson.date,
              data: res,
            });
            // 更新数据
            this.setState({ stories: newData }, () => {
              // 等待数据渲染完成,避免loading状态早于渲染结束
              setTimeout(() => {
                this.setState({
                  pullUpLoading: false,
                });
              }, 550);
            });
          });
        }
      })
      .catch(() => {
        this.setState({
          pullUpLoading: false,
        });
      });
  };
  /**
   * 监听列表项点击 跳转到详情页  记录点击状态
   * @param {Object} item 列表项
   */
  bindListTap = item => {
    // 页面跳转
    let idArray = []; //日报ID数组
    let selectdIndex; //点击项的数组下标
    if (item.image) {
      //根据属性判断是列表或轮播图
      //轮播图时
      this.state.topStories.forEach(el => {
        idArray.push({
          id: el.id,
          selected: el.id === item.id ? true : false,
        });
      });
    } else {
      // 列表时
      this.state.stories.forEach(items => {
        items.data.forEach(el => {
          idArray.push({
            id: el.id,
            selected: el.id === item.id ? true : false,
          });
        });
      });
    }
    // 获取数组下标
    idArray.forEach((el, index) => {
      if (el.id === item.id) {
        selectdIndex = index;
      }
    });
    this.props.navigation.navigate('Details', {
      idArray,
      selectdIndex,
    });
    InteractionManager.runAfterInteractions(() => {
      // 存储访问状态
      storage
        .save({
          key: 'visited',
          id: item.id,
          data: true,
          expires: null,
        })
        .then(() => {
          // 更新访问状态
          // PS：这里需要将旧数据解构成一个新数组 , 可以避免setState不生效问题，因为setState是浅比较 。
          let stories = [...this.state.stories];
          stories.forEach(items => {
            items.data.forEach(i => {
              if (i.id === item.id) {
                i.visited = true;
                return false;
              }
            });
          });
          this.setState({
            stories,
          });
        });
    });
  };

  /**
   * 格式化分组标题日期
   *
   *  @param {String} val 日期字符串
   *  @return {String}  格式化后的日期
   */
  formatDate(date) {
    let currentDate = Tools.formatDay()
      .split('-')
      .join('');
    if (currentDate === date) {
      return '今日热闻';
    } else {
      return String(date).length === 8
        ? Tools.formatMonthDay(date) + ' ' + Tools.formatWeek(date)
        : null;
    }
  }
  /**
   * 滚动监听
   * 跟随滚动位置更新Header标题
   * @param {Object} event 滚动事件
   */

  bindOnScroll(event) {
    // 减去标题和轮播图高度
    let y = event.nativeEvent.contentOffset.y - 230;
    let heightArr = this.state.listHeight;
    if (y < 0) {
      this.props.navigation.setParams({ title: '首页' });
    } else {
      for (let i = 0; i < heightArr.length; i++) {
        if (heightArr[i] >= y) {
          let title = this.formatDate(this.state.stories[i].key);
          if (this.props.navigation.getParam({ title }) !== title) {
            this.props.navigation.setParams({ title });
          }
          break;
        }
      }
    }
  }
  /**
   * 监听列表高度变化
   * @param {Object} event 列表高度数值
   */
  listenListHeight(event) {
    var { height } = event.nativeEvent.layout;
    let heightArr = this.state.listHeight;
    heightArr.push(Number.parseInt(height, 10));
    // 每次组件高度变化 实际上会触发两次函数 , 只取组件渲染完毕后的高度。
    if (heightArr.length > this.state.stories.length) {
      heightArr.splice(heightArr.length - 2, 1);
    }
    this.setState({
      listHeight: heightArr,
    });
  }
  /**
   * 历史日报点击事件
   */
  handleHistoryClick() {
    // 生成随机日期 作者:// https://cloud.tencent.com/developer/news/391925
    let m = new Date('October 23 , 2013 00:00:00');
    m = m.getTime();
    let n = new Date();
    n = n.getTime();
    let s = n - m;
    s = Math.floor(Math.random() * s);
    s = m + s;
    s = new Date(s);
    this.handleDatePicked(s, '随便看看');
  }
  /**
   * 控制弹出菜单切换显示
   */
  tooglePopupMenu = () => {
    this.setState({
      opened: !this.state.opened,
    });
  };
  /**
   *  控制日期选择器显示
   */
  toggleDateTimePicker = () => {
    this.setState({
      isDateTimePickerVisible: !this.state.isDateTimePickerVisible,
    });
  };

  //

  /**
   *  日期选择器点击行为
   */
  handleDatePicked = (date, title = '') => {
    let dateStr = Tools.formatDay(date)
      .split('-')
      .join('');
    this.props.navigation.navigate('Section', {
      date: dateStr,
      title,
    });
    this.setState({
      isDateTimePickerVisible: false,
    });
  };

  /**
   * 处理安卓返回键行为
   */
  onBackButtonPressAndroid = () => {
    //  判断侧边栏抽屉菜单是否为打开状态
    if (this.props.app.isDrawerOpen) {
      this.props.navigation.closeDrawer();
      return true;
    } else if (
      this.lastBackPressed &&
      this.lastBackPressed + 2000 >= Date.now()
    ) {
      return false;
    } else {
      this.lastBackPressed = Date.now();
      Tools.toast('再按一次退出应用');
      return true;
    }
  };

  /**
   *  日报列表分组头部组件
   *  @param  {Object}   分组日报数据
   */
  renderSectioHeader = items => {
    return (
      <Text
        style={[styles.sectionTitle, { color: this.props.theme.colors.text }]}>
        {this.formatDate(items.section.key)}
      </Text>
    );
  };
  /**
   * 渲染右上角自定义菜单
   */
  renderCustomMenu = props => {
    const { style, children, layouts, ...other } = props;
    const position = { top: 0, right: 0 };
    return (
      <View {...other} style={[style, position]}>
        {children}
      </View>
    );
  };

  render() {
    return (
      //  安卓返回键监听组件
      <AndroidBackHandler onBackPress={this.onBackButtonPressAndroid}>
        <MyScrollView
          pullupfresh={this.pullupfresh}
          onScroll={this.bindOnScroll.bind(this)}
          refresh={this.state.refresh}
          onRefresh={this.bindOnRefresh.bind(this)}>
          {/* 轮播图 */}
          <HomeSwiper data={this.state.topStories} onPress={this.bindListTap} />
          {/* 日报列表 */}
          <View onLayout={this.listenListHeight.bind(this)}>
            <StoriesList
              ref={listView => (this.listView = listView)}
              data={this.state.stories}
              onPress={this.bindListTap}
              sectionHeader={this.renderSectioHeader}
            />
          </View>
          {/* 避免无数据时还显示触底加载文字 */}
          {this.state.stories.length > 0 ? (
            <PullUpLoad
              loading={this.state.pullUpLoading}
              onPress={this.pullupfresh}
              finished={this.state.finished}
            />
          ) : null}
          {/* Header弹出选择菜单 */}
          <Menu
            opened={this.state.opened}
            style={styles.popupWrapper}
            onBackdropPress={this.tooglePopupMenu}>
            <MenuTrigger />
            <MenuOptions
              customStyles={{
                optionsContainer: styles.popupOptionsContainer,
                optionText: styles.popupOptionText,
              }}>
              <MenuOption
                onSelect={() => {
                  this.props.theme.switchTheme();
                  this.setState({
                    opened: false,
                  });
                }}
                text={
                  this.props.theme.colors.themeType === 'default'
                    ? '夜间主题'
                    : '日间主题'
                }
              />
              <MenuOption
                onSelect={() => {
                  this.tooglePopupMenu();
                  this.props.navigation.navigate('Setting');
                }}
                text="设置选项"
              />
            </MenuOptions>
          </Menu>
          {/* 日期选择器 */}
          <DateTimePicker
            // 最大日期
            maximumDate={
              //判断当前时间 是否大于早上7点 , 日报每天早上7点更新
              //如果时间早于7点 ,则最大可选择日起为昨天.
              Number(Tools.formatTime().split(':')[0]) >= 7
                ? new Date()
                : new Date(new Date().getTime() - 24 * 60 * 60 * 1000)
            }
            // 最小日期
            minimumDate={new Date(2013, 10, 20)}
            isVisible={this.state.isDateTimePickerVisible}
            onConfirm={this.handleDatePicked}
            onCancel={this.toggleDateTimePicker}
          />
        </MyScrollView>
      </AndroidBackHandler>
    );
  }
}

const styles = StyleSheet.create({
  sectionTitle: {
    marginTop: 15,
    marginBottom: 10,
    marginLeft: 15,
  },
  headerRightWrapper: {
    justifyContent: 'space-between',
    width: 140,
    flexDirection: 'row',
  },
  popupWrapper: {
    position: 'absolute',
    right: 5,
    top: -10,
  },
  popupOptionsContainer: {
    width: 180,
  },
  popupOptionText: {
    paddingLeft: 5,
    fontSize: 16,
    color: '#333',
    lineHeight: 30,
  },
});

export default Home;
