import React, {Component} from 'react';
import {View, StyleSheet, ActivityIndicator, Text} from 'react-native';
import {observer, inject} from 'mobx-react';

@inject('theme')
@observer
class PullUpLoad extends Component {
  render() {
    return (
      <View
        style={[
          styles.loadWrapper,
          {backgroundColor: this.props.theme.colors.listBackground},
        ]}>
        {this.props.loading && !this.props.finished ? (
          <View style={styles.loadWrapper}>
            <ActivityIndicator animating={true} color="#666" size="small" />
            <Text
              style={[
                styles.remindText,
                {color: this.props.theme.colors.text},
              ]}>
              正在加载...
            </Text>
          </View>
        ) : null}
        {!this.props.loading && !this.props.finished ? (
          <Text style={{color: this.props.theme.colors.text}}>
            下拉加载更多
          </Text>
        ) : null}
        {this.props.finished && !this.props.loading ? (
          <Text
            style={[styles.remindText, {color: this.props.theme.colors.text}]}>
            没有更多了...
          </Text>
        ) : null}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  loadWrapper: {
    height: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  remindText: {
    marginLeft: 10,
  },
});
export default PullUpLoad;
