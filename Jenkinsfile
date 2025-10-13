pipeline {
    agent any

    environment {
        IMAGE_NAME = "lova1254/andhrawala"
        IMAGE_TAG  = "latest"
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Archive HTML') {
            steps {
                archiveArtifacts artifacts: '**/*.html', fingerprint: true
            }
        }

        stage('Docker Build & Push') {
            steps {
                script {
                    // Use Jenkins stored credentials (dockerhub-pass)
                    withCredentials([usernamePassword(credentialsId: 'dockerhub-pass', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')]) {
                        sh """
                            echo "Logging into Docker Hub..."
                            docker login -u $DOCKER_USER -p $DOCKER_PASS
                            
                            echo "Building Docker image..."
                            docker build -t $IMAGE_NAME:$IMAGE_TAG .
                            
                            echo "Pushing Docker image..."
                            docker push $IMAGE_NAME:$IMAGE_TAG
                            
                            echo "Logging out from Docker Hub..."
                            docker logout
                        """
                    }
                }
            }
        }
    }

    post {
        always {
            echo "Pipeline finished!"
        }
        failure {
            echo "❌ Pipeline failed!"
        }
        success {
            echo "✅ Pipeline succeeded! Check Docker Hub for the image."
        }
    }
}
