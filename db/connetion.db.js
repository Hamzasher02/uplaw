import mongo from 'mongoose'

 function connectDatabase(url) {
    return mongo.connect(url)
}

export default connectDatabase