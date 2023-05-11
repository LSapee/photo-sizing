
# AWS LAMBDA 연습 

> 사진 최적화 서비스 연습

책 따라해보기 -> 코드 작성 and aws cli 연습

추후 페이지의 기능으로 추가 해보면 좋을 듯한 기능!

cloudfront에는 index가 등록 되어있고 s3버킷에 index.html파일이 있지만 도메인 접속 불가능! -> 원인 파학중

코드상에서 요청하는 서비스는

```
sls deploy 하면 나오는 get- 도메인

curl 도메인
 
{cdnURL : cdnurl 주소 ,uploadURL : uploadURL주소}

// 이미지 최적화 업로드
curl -T 111.jpg uploadURL주소

//다운로드
curl -O cdnURL주소

//이미지 정보 보기
curl -I cdnURL

// 이미지 보기
인터넷에 해당 URL로 접속 또는 다운 받아서 보기

```


이미지 출처 : https://wall.alphacoders.com/big.php?i=820043