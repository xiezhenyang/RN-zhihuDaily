/* eslint-disable no-undef */
import React, {Component} from 'react';
import {Text, StyleSheet} from 'react-native';
import {
  Container,
  Content,
  ListItem,
  CheckBox,
  Body,
  Left,
  Right,
} from 'native-base';
// import codePush from "react-native-code-push";
import DeviceInfo from 'react-native-device-info';
import {Tools} from '../../utils';
import {observer, inject} from 'mobx-react';

@inject('theme')
@observer
class Setting extends Component {
  static navigationOptions = ({screenProps}) => {
    return {
      title: '设置',
      headerStyle: {
        backgroundColor: screenProps.theme,
      },
    };
  };
  constructor(props) {
    super(props);
    this.state = {
      bigSizeState: null,
      version: DeviceInfo.getVersion(),
      isUpdate: false,
    };
  }

  componentDidMount() {
    storage
      .load({
        key: 'bigSize',
      })
      .then(res => {
        if (res) {
          this.setState({
            bigSizeState: true,
          });
        }
      })
      .catch(() => {});
  }
  switchBigSizeSelct = () => {
    global.storage
      .save({
        key: 'bigSize',
        data: !this.state.bigSizeState,
      })
      .then(() => {
        this.setState({
          bigSizeState: !this.state.bigSizeState,
        });
      })
      .catch(() => {
        Tools.toast('系统异常,无法切换');
      });
  };
  clearCache = () => {
    Tools.toast('正在清空缓存...');
    storage
      .clearMapForKey('details')
      .then(() => {
        setTimeout(() => {
          Tools.toast('缓存已清空');
        }, 1000);
      })
      .catch(() => {
        setTimeout(() => {
          Tools.toast('系统异常,操作失败');
        }, 1000);
      });
  };
  openAbout = () => {
    this.props.navigation.navigate('About');
  };
  openFeedBack = () => {
    this.props.navigation.navigate('Feedback');
  };
  checkUpdates = () => {
    Tools.toast('功能已注释');
    // if(this.state.isUpdate){
    //   Tools.toast('检查更新中...')
    //   this.setState({
    //     isUpdate:true
    //   })
    // }else{
    //   Tools.toast('正在检查更新...',500)
    //   this.setState({
    //     isUpdate:true
    //   })
    // codePush.checkForUpdate().then((update) => {
    //   if (!update) {
    //     Tools.toast('应用是最新的')
    //     this.setState({
    //       isUpdate:false
    //     })
    //   } else {
    //     Alert.alert(
    //       '发现可用更新',
    //       '是否更新到最新版本？',
    //       [
    //         {text: '更新', onPress: () => {
    //           codePush.sync();
    //           Tools.toast('正在下载更新，更新将在后台自动安装')
    //           this.setState({
    //             isUpdate:false
    //           })
    //         }},
    //         {text: '取消',  style: 'cancel', onPress: () => {
    //           this.setState({
    //             isUpdate:false
    //           })
    //         }},
    //       ],
    //     )
    //   }

    // }).catch(()=>{
    //     Tools.toast('无法连接服务器，请稍后重试')
    //     this.setState({
    //     isUpdate:false
    //  })
    // });
    // }
  };
  render() {
    return (
      <Container
        style={{backgroundColor: this.props.theme.colors.containerBackground}}>
        <Content>
          <ListItem
            itemDivider
            style={{backgroundColor: this.props.theme.colors.listBackground}}>
            <Text style={{color: this.props.theme.colors.text}}>常规</Text>
          </ListItem>
          <ListItem
            onPress={this.switchBigSizeSelct}
            last
            style={{backgroundColor: this.props.theme.colors.itemBackground}}>
            <Body>
              <Text
                style={[
                  styles.itemText,
                  {color: this.props.theme.colors.item},
                ]}>
                大字号
              </Text>
            </Body>
            <CheckBox
              checked={this.state.bigSizeState}
              onPress={this.switchBigSizeSelct}
            />
          </ListItem>
          <ListItem
            onPress={this.clearCache}
            last
            style={{backgroundColor: this.props.theme.colors.itemBackground}}>
            <Text
              style={[styles.itemText, {color: this.props.theme.colors.item}]}>
              清楚缓存
            </Text>
          </ListItem>
          <ListItem
            itemDivider
            style={{backgroundColor: this.props.theme.colors.listBackground}}>
            <Text style={{color: this.props.theme.colors.text}}>其他</Text>
          </ListItem>
          <ListItem
            onPress={this.openFeedBack}
            last
            style={{backgroundColor: this.props.theme.colors.itemBackground}}>
            <Text
              style={[styles.itemText, {color: this.props.theme.colors.item}]}>
              意见反馈
            </Text>
          </ListItem>
          <ListItem
            onPress={this.checkUpdates}
            last
            style={{backgroundColor: this.props.theme.colors.itemBackground}}>
            <Left>
              <Text
                style={[
                  styles.itemText,
                  {color: this.props.theme.colors.item},
                ]}>
                检查更新
              </Text>
            </Left>
            <Right>
              <Text style={styles.version}>{this.state.version}</Text>
            </Right>
          </ListItem>
          <ListItem
            onPress={this.openAbout}
            last
            style={{backgroundColor: this.props.theme.colors.itemBackground}}>
            <Text
              style={[styles.itemText, {color: this.props.theme.colors.item}]}>
              关于我们
            </Text>
          </ListItem>
        </Content>
      </Container>
    );
  }
}
var styles = StyleSheet.create({
  itemText: {
    fontSize: 16,
  },
  version: {
    fontSize: 16,
    color: '#999',
  },
});
export default Setting;
