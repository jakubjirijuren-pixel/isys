import { View, Text, StyleSheet } from 'react-native';
export default function Buildings() { return <View style={styles.page}><Text style={styles.title}>Evidence objektů</Text><Text style={styles.text}>Modul se připravuje. Připojení k centrálnímu API doplníme až po zabezpečení přihlašování.</Text></View>; }
const styles=StyleSheet.create({page:{flex:1,padding:24,backgroundColor:'#f3f6fa'},title:{fontSize:24,fontWeight:'700',color:'#153a63',marginBottom:12},text:{color:'#516479',fontSize:16,lineHeight:24}});
